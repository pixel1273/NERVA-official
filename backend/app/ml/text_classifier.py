"""
NERVA Text Severity Classifier — Auto-classifies incident report severity from text.

Two modes:
  1. Rule-based (default): fast keyword + pattern matching, no model needed
  2. ML-based: fine-tuned IndicBERT for multilingual classification

For SIH demo: rule-based is sufficient and works instantly.
For production: fine-tune IndicBERT on labeled incident reports.

Classes: low, medium, high, critical
"""
import re
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Severity keyword dictionaries (English + transliterated NER languages)
CRITICAL_KEYWORDS = [
    # English
    "collapse", "collapsed", "destroyed", "washed away", "swept away",
    "fatality", "fatalities", "death", "dead", "casualties", "trapped",
    "bridge collapse", "total blockage", "completely blocked", "impassable",
    "evacuate", "evacuation", "emergency", "urgent", "life threatening",
    "massive landslide", "major flood", "dam breach", "earthquake",
    # Severity indicators
    "100% blocked", "fully blocked", "road gone", "no access",
]

HIGH_KEYWORDS = [
    # English
    "landslide", "mudslide", "debris flow", "major crack", "deep crack",
    "road damage", "heavy flooding", "submerged", "washout", "partial collapse",
    "retaining wall", "displacement", "subsidence", "restricted",
    "heavy vehicles restricted", "single lane", "severely damaged",
    "relief supplies", "stranded", "cut off", "isolated",
    # Severity indicators
    "60%", "70%", "80%", "90%", "blocking", "partial block",
]

MEDIUM_KEYWORDS = [
    # English
    "crack", "pothole", "surface damage", "minor landslide", "small slide",
    "water logging", "slow traffic", "detour needed", "inspection required",
    "needs repair", "degraded", "damaged surface", "erosion",
    "rising water", "water level", "warning",
    # Severity indicators
    "30%", "40%", "50%",
]

LOW_KEYWORDS = [
    # English
    "cleared", "restored", "reopened", "operational", "resolved",
    "minor", "small crack", "routine", "maintenance", "scheduled",
    "all lanes open", "normal traffic", "no issues", "stable",
    "repaired", "fixed",
]


class TextSeverityClassifier:
    """
    Classifies incident report text into severity levels.
    """

    def __init__(self):
        self.ml_model = None
        self.ml_tokenizer = None
        self.is_ml_loaded = False

        # Try to load fine-tuned model
        self._try_load_ml_model()

    def _try_load_ml_model(self):
        """Attempt to load a fine-tuned IndicBERT model."""
        import os
        model_path = os.path.join(os.path.dirname(__file__), "models", "text_classifier")
        if os.path.exists(model_path):
            try:
                from transformers import AutoModelForSequenceClassification, AutoTokenizer

                self.ml_tokenizer = AutoTokenizer.from_pretrained(model_path)
                self.ml_model = AutoModelForSequenceClassification.from_pretrained(model_path)
                self.ml_model.eval()
                self.is_ml_loaded = True
                logger.info("Loaded fine-tuned text severity classifier")
            except Exception as e:
                logger.warning(f"Could not load ML text classifier: {e}")

    def classify(self, text: str, incident_type: Optional[str] = None) -> Dict:
        """
        Classify the severity of an incident report.

        Args:
            text: The incident description text (can be multilingual)
            incident_type: Optional incident type (road_block, landslide, flood, etc.)

        Returns:
            Dict with severity, confidence, matched_keywords, and reasoning
        """
        if self.is_ml_loaded:
            return self._classify_ml(text)
        else:
            return self._classify_rules(text, incident_type)

    def _classify_rules(self, text: str, incident_type: Optional[str] = None) -> Dict:
        """Rule-based classification using keyword matching and scoring."""
        text_lower = text.lower().strip()

        # Score each severity level
        scores = {
            "critical": 0.0,
            "high": 0.0,
            "medium": 0.0,
            "low": 0.0,
        }

        matched = {
            "critical": [],
            "high": [],
            "medium": [],
            "low": [],
        }

        # Check keyword matches
        for keyword in CRITICAL_KEYWORDS:
            if keyword.lower() in text_lower:
                scores["critical"] += 1.0
                matched["critical"].append(keyword)

        for keyword in HIGH_KEYWORDS:
            if keyword.lower() in text_lower:
                scores["high"] += 1.0
                matched["high"].append(keyword)

        for keyword in MEDIUM_KEYWORDS:
            if keyword.lower() in text_lower:
                scores["medium"] += 1.0
                matched["medium"].append(keyword)

        for keyword in LOW_KEYWORDS:
            if keyword.lower() in text_lower:
                scores["low"] += 1.0
                matched["low"].append(keyword)

        # Boost based on incident type
        type_boost = {
            "landslide": {"critical": 0.5, "high": 0.3},
            "flood": {"high": 0.5, "critical": 0.3},
            "bridge_issue": {"critical": 0.5, "high": 0.3},
            "road_damage": {"medium": 0.3, "high": 0.2},
            "road_block": {"high": 0.3, "medium": 0.2},
        }

        if incident_type and incident_type in type_boost:
            for level, boost in type_boost[incident_type].items():
                scores[level] += boost

        # Check for urgency patterns
        urgency_patterns = [
            (r"immediately|right now|asap|urgent", "critical", 0.8),
            (r"as soon as possible|quickly|rapidly", "high", 0.5),
            (r"(?:within|next)\s+\d+\s+(?:hour|hr)", "high", 0.4),
            (r"(?:need|require)s?\s+(?:immediate|urgent)", "critical", 0.7),
        ]

        for pattern, level, boost in urgency_patterns:
            if re.search(pattern, text_lower):
                scores[level] += boost

        # Determine severity from scores
        total_score = sum(scores.values())
        if total_score == 0:
            severity = "medium"  # Default to medium if no keywords match
            confidence = 0.3
        else:
            severity = max(scores, key=scores.get)
            confidence = min(0.95, scores[severity] / max(total_score, 1))

        # Collect all matched keywords
        all_matched = []
        for level, keywords in matched.items():
            all_matched.extend(keywords)

        return {
            "severity": severity,
            "confidence": round(confidence, 4),
            "matched_keywords": all_matched[:10],  # Top 10
            "scores": {k: round(v, 2) for k, v in scores.items()},
            "reasoning": self._generate_reasoning(severity, all_matched, incident_type),
            "model": "rule_based",
        }

    def _classify_ml(self, text: str) -> Dict:
        """ML-based classification using fine-tuned IndicBERT."""
        import torch

        inputs = self.ml_tokenizer(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256,
        )

        with torch.no_grad():
            outputs = self.ml_model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1)[0]

        labels = ["low", "medium", "high", "critical"]
        top_idx = probs.argmax().item()

        return {
            "severity": labels[top_idx],
            "confidence": round(probs[top_idx].item(), 4),
            "matched_keywords": [],
            "scores": {labels[i]: round(probs[i].item(), 4) for i in range(4)},
            "reasoning": f"ML model classified this as '{labels[top_idx]}' with {probs[top_idx]:.0%} confidence.",
            "model": "indicbert_finetuned",
        }

    def _generate_reasoning(self, severity: str, keywords: list, incident_type: Optional[str]) -> str:
        if not keywords:
            base = f"No strong severity indicators found in text. Defaulting to '{severity}'."
            if incident_type:
                base += f" Incident type '{incident_type}' considered."
            return base

        keyword_str = ", ".join(f"'{k}'" for k in keywords[:5])
        return f"Classified as '{severity}' based on keywords: {keyword_str}."


# ─────────────────────────────────────────────────────────
# Fine-tuning Script (run standalone to fine-tune IndicBERT)
# ─────────────────────────────────────────────────────────

def finetune_text_classifier(
    train_data: list,
    output_dir: str = None,
    base_model: str = "ai4bharat/IndicBERTv2-MLM-only",
    epochs: int = 5,
    batch_size: int = 16,
    learning_rate: float = 2e-5,
):
    """
    Fine-tune IndicBERT for severity classification.

    Args:
        train_data: List of dicts with "text" and "label" keys.
                    label should be 0=low, 1=medium, 2=high, 3=critical
        output_dir: Where to save the fine-tuned model
        base_model: Hugging Face model ID for the base model

    Usage:
        data = [
            {"text": "Massive landslide blocks NH-37", "label": 3},
            {"text": "Minor crack on service road", "label": 0},
            ...
        ]
        finetune_text_classifier(data)
    """
    import os
    import torch
    from torch.utils.data import DataLoader, Dataset
    from transformers import AutoModelForSequenceClassification, AutoTokenizer, AdamW

    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "models", "text_classifier")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Fine-tuning on: {device}")

    tokenizer = AutoTokenizer.from_pretrained(base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        base_model, num_labels=4
    ).to(device)

    class SeverityDataset(Dataset):
        def __init__(self, data, tokenizer):
            self.data = data
            self.tokenizer = tokenizer

        def __len__(self):
            return len(self.data)

        def __getitem__(self, idx):
            item = self.data[idx]
            encoding = self.tokenizer(
                item["text"],
                padding="max_length",
                truncation=True,
                max_length=256,
                return_tensors="pt",
            )
            return {
                "input_ids": encoding["input_ids"].squeeze(),
                "attention_mask": encoding["attention_mask"].squeeze(),
                "labels": torch.tensor(item["label"], dtype=torch.long),
            }

    dataset = SeverityDataset(train_data, tokenizer)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    optimizer = AdamW(model.parameters(), lr=learning_rate)

    for epoch in range(epochs):
        model.train()
        total_loss = 0
        correct = 0
        total = 0

        for batch in loader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()

            total_loss += loss.item()
            preds = outputs.logits.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        acc = correct / total
        print(f"Epoch {epoch+1}/{epochs} — Loss: {total_loss/len(loader):.4f}, Acc: {acc:.3f}")

    # Save model
    os.makedirs(output_dir, exist_ok=True)
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"Model saved to {output_dir}")


# Singleton instance
text_classifier = TextSeverityClassifier()
