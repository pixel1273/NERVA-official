"""
NERVA Image Severity Classifier — Classifies road damage photos by type and severity.

Uses EfficientNet-B0 with transfer learning (pre-trained on ImageNet).
For SIH demo: works with the RDD2022 (Road Damage Detection) dataset.
For NVIDIA: can be replaced with TAO Toolkit training pipeline.

Classes:
  - Type: landslide, washout, crack, flood, bridge_damage, clear
  - Severity: low, medium, high, critical
"""
import os
import io
import logging
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Road damage classification labels
DAMAGE_TYPES = ["landslide", "washout", "crack", "flood", "bridge_damage", "clear"]
SEVERITY_LEVELS = ["low", "medium", "high", "critical"]


class ImageSeverityClassifier:
    """
    Classifies road damage images using EfficientNet-B0 (transfer learning).

    Two modes:
      1. Pre-trained mode: uses a saved model checkpoint
      2. Heuristic mode: uses image analysis heuristics (fallback when no model)
    """

    def __init__(self):
        self.model = None
        self.transform = None
        self.is_loaded = False
        self._model_dir = os.path.join(os.path.dirname(__file__), "models")
        self._model_path = os.path.join(self._model_dir, "image_classifier.pth")

        # Try to load pre-trained model
        if os.path.exists(self._model_path):
            self._load_model()
        else:
            logger.info(
                "No pre-trained image classifier found. Using heuristic classifier. "
                "Run the training script to create a real model: python -m app.ml.train_image_classifier"
            )

    def _load_model(self):
        """Load a pre-trained EfficientNet-B0 model."""
        try:
            import torch
            import torchvision.models as models
            import torchvision.transforms as transforms

            # Build model architecture
            self.model = models.efficientnet_b0(weights=None)
            # Replace classifier head for our classes
            num_features = self.model.classifier[1].in_features
            self.model.classifier[1] = torch.nn.Linear(num_features, len(DAMAGE_TYPES))

            # Load weights
            state_dict = torch.load(self._model_path, map_location="cpu", weights_only=True)
            self.model.load_state_dict(state_dict)
            self.model.eval()

            # Define transforms (same as training)
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])

            self.is_loaded = True
            logger.info("Image classifier model loaded successfully")

        except ImportError:
            logger.warning("torch/torchvision not installed. Using heuristic classifier.")
        except Exception as e:
            logger.error(f"Failed to load image classifier: {e}")

    async def classify(self, image_bytes: bytes) -> Dict:
        """
        Classify a road damage image.

        Args:
            image_bytes: Raw bytes of the uploaded image (JPEG/PNG)

        Returns:
            Dict with damage_type, severity, confidence, and description
        """
        if self.is_loaded and self.model is not None:
            return self._classify_with_model(image_bytes)
        else:
            return self._classify_heuristic(image_bytes)

    def _classify_with_model(self, image_bytes: bytes) -> Dict:
        """Run inference through the trained EfficientNet model."""
        import torch
        from PIL import Image

        # Load and preprocess image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        input_tensor = self.transform(image).unsqueeze(0)

        # Inference
        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]

        # Get top prediction
        top_idx = probabilities.argmax().item()
        damage_type = DAMAGE_TYPES[top_idx]
        confidence = probabilities[top_idx].item()

        # Map damage type to severity based on confidence
        severity = self._map_severity(damage_type, confidence)

        return {
            "damage_type": damage_type,
            "severity": severity,
            "confidence": round(confidence, 4),
            "all_probabilities": {
                DAMAGE_TYPES[i]: round(probabilities[i].item(), 4)
                for i in range(len(DAMAGE_TYPES))
            },
            "description": self._generate_description(damage_type, severity, confidence),
            "model": "efficientnet_b0",
        }

    def _classify_heuristic(self, image_bytes: bytes) -> Dict:
        """
        Fallback heuristic classifier using basic image analysis.
        Analyzes color distribution and image properties to estimate damage.
        """
        try:
            from PIL import Image
            import struct

            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            width, height = image.size

            # Sample pixels to analyze color distribution
            pixels = list(image.getdata())
            total_pixels = len(pixels)

            if total_pixels == 0:
                return self._default_classification()

            # Calculate average color channels
            avg_r = sum(p[0] for p in pixels) / total_pixels
            avg_g = sum(p[1] for p in pixels) / total_pixels
            avg_b = sum(p[2] for p in pixels) / total_pixels

            # Calculate brownness (earth/debris indicator)
            brownness = (avg_r - avg_g) / max(1, avg_r + avg_g + avg_b)
            # Calculate darkness (severity indicator)
            darkness = 1.0 - (avg_r + avg_g + avg_b) / (3 * 255)
            # Calculate blueness (water/flood indicator)
            blueness = avg_b / max(1, avg_r + avg_g + avg_b)

            # Heuristic classification
            if blueness > 0.38:
                damage_type = "flood"
                confidence = min(0.7, blueness)
            elif brownness > 0.15 and darkness > 0.4:
                damage_type = "landslide"
                confidence = min(0.65, brownness + darkness * 0.3)
            elif darkness > 0.5:
                damage_type = "washout"
                confidence = min(0.55, darkness)
            elif brownness > 0.08:
                damage_type = "crack"
                confidence = min(0.5, brownness * 2)
            else:
                damage_type = "clear"
                confidence = 0.4

            severity = self._map_severity(damage_type, confidence)

            return {
                "damage_type": damage_type,
                "severity": severity,
                "confidence": round(confidence, 4),
                "all_probabilities": {},
                "description": self._generate_description(damage_type, severity, confidence),
                "model": "heuristic (no trained model available)",
                "note": "Run training script for accurate classification",
            }

        except ImportError:
            return self._default_classification()

    def _map_severity(self, damage_type: str, confidence: float) -> str:
        """Map damage type + confidence to severity level."""
        severity_map = {
            "landslide": "critical" if confidence > 0.7 else "high",
            "washout": "critical" if confidence > 0.8 else "high",
            "flood": "high" if confidence > 0.6 else "medium",
            "crack": "medium" if confidence > 0.5 else "low",
            "bridge_damage": "critical",
            "clear": "low",
        }
        return severity_map.get(damage_type, "medium")

    def _generate_description(self, damage_type: str, severity: str, confidence: float) -> str:
        descriptions = {
            "landslide": f"Landslide/debris detected with {confidence:.0%} confidence. Road likely blocked.",
            "washout": f"Road washout detected with {confidence:.0%} confidence. Surface damage severe.",
            "flood": f"Flooding detected with {confidence:.0%} confidence. Road may be submerged.",
            "crack": f"Road surface cracks detected with {confidence:.0%} confidence. Inspection recommended.",
            "bridge_damage": f"Bridge structural damage detected with {confidence:.0%} confidence. Immediate closure advised.",
            "clear": f"No significant damage detected. Road appears operational.",
        }
        return descriptions.get(damage_type, "Unable to classify damage type.")

    def _default_classification(self) -> Dict:
        return {
            "damage_type": "unknown",
            "severity": "medium",
            "confidence": 0.0,
            "all_probabilities": {},
            "description": "Could not analyze image. Manual inspection required.",
            "model": "none",
        }


# ─────────────────────────────────────────────────────────
# Training Script (run standalone to train the model)
# ─────────────────────────────────────────────────────────

def train_image_classifier(data_dir: str, epochs: int = 20, batch_size: int = 32):
    """
    Train the EfficientNet-B0 image classifier on a labeled dataset.

    Expected directory structure:
      data_dir/
        landslide/
          img001.jpg
          img002.jpg
        washout/
          ...
        crack/
          ...
        flood/
          ...
        bridge_damage/
          ...
        clear/
          ...

    Usage:
      python -c "from app.ml.image_classifier import train_image_classifier; train_image_classifier('./road_damage_data')"
    """
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader
    import torchvision.models as models
    import torchvision.transforms as transforms
    import torchvision.datasets as datasets

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")

    # Data augmentation for training
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    # Load dataset
    dataset = datasets.ImageFolder(data_dir, transform=train_transform)
    print(f"Found {len(dataset)} images in {len(dataset.classes)} classes: {dataset.classes}")

    # Split train/val (80/20)
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_set, val_set = torch.utils.data.random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_set, batch_size=batch_size, shuffle=False, num_workers=2)

    # Build model (transfer learning)
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    # Freeze backbone
    for param in model.features.parameters():
        param.requires_grad = False
    # Replace classifier head
    num_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_features, len(DAMAGE_TYPES))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)

    best_acc = 0.0
    for epoch in range(epochs):
        # Train
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

        train_acc = correct / total

        # Validate
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()

        val_acc = val_correct / val_total
        print(f"Epoch {epoch+1}/{epochs} — Train Acc: {train_acc:.3f}, Val Acc: {val_acc:.3f}, Loss: {running_loss/len(train_loader):.4f}")

        if val_acc > best_acc:
            best_acc = val_acc
            model_dir = os.path.join(os.path.dirname(__file__), "models")
            os.makedirs(model_dir, exist_ok=True)
            torch.save(model.state_dict(), os.path.join(model_dir, "image_classifier.pth"))
            print(f"  → Saved best model (val_acc={val_acc:.3f})")

        scheduler.step()

    print(f"\nTraining complete. Best validation accuracy: {best_acc:.3f}")


# Singleton instance
image_classifier = ImageSeverityClassifier()
