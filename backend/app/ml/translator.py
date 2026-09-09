"""
NERVA Multilingual Translator — Auto-translates alerts to NER regional languages.

Supports two backends:
  1. API-based (LiteLLM → Gemini/GPT) — fast setup, needs API key
  2. Local model (IndicTrans2 by AI4Bharat) — offline, needs GPU + model download

For SIH demo, API-based is recommended. For production, use IndicTrans2.
"""
import os
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Supported NER languages with their codes
NER_LANGUAGES = {
    "as": "Assamese",
    "hi": "Hindi",
    "mn": "Manipuri (Meitei)",
    "mz": "Mizo",
    "na": "Nagamese",
    "bn": "Bengali",
    "en": "English",
}


class NERVATranslator:
    """
    Multilingual translator for NERVA alerts and notifications.
    Uses API-based translation (LiteLLM) by default, with fallback to local IndicTrans2.
    """

    def __init__(self, backend: str = "api"):
        """
        Args:
            backend: "api" for LiteLLM-based translation, "local" for IndicTrans2
        """
        self.backend = backend
        self._local_model = None
        self._local_tokenizer = None

        if backend == "local":
            self._load_indictrans2()

    def _load_indictrans2(self):
        """Load the IndicTrans2 model for local inference."""
        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            model_name = "ai4bharat/indictrans2-en-indic-1B"
            logger.info(f"Loading IndicTrans2 model: {model_name}")
            self._local_tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
            self._local_model = AutoModelForSeq2SeqLM.from_pretrained(model_name, trust_remote_code=True)
            logger.info("IndicTrans2 model loaded successfully")
        except ImportError:
            logger.error("transformers package not installed. Run: pip install transformers sentencepiece")
            raise
        except Exception as e:
            logger.error(f"Failed to load IndicTrans2: {e}")
            raise

    async def translate(self, text: str, target_lang: str, source_lang: str = "en") -> str:
        """
        Translate text to the target language.

        Args:
            text: Source text to translate
            target_lang: Target language code (e.g., "as", "hi", "mn")
            source_lang: Source language code (default: "en")

        Returns:
            Translated text string
        """
        if target_lang == source_lang:
            return text

        target_name = NER_LANGUAGES.get(target_lang, target_lang)

        if self.backend == "api":
            return await self._translate_api(text, target_name)
        else:
            return self._translate_local(text, target_lang)

    async def translate_all(self, text: str, target_langs: Optional[list] = None) -> Dict[str, str]:
        """
        Translate text to all supported NER languages at once.

        Args:
            text: English text to translate
            target_langs: List of language codes. Defaults to ["as", "hi", "mn", "mz", "na"]

        Returns:
            Dict mapping language code → translated text
        """
        if target_langs is None:
            target_langs = ["as", "hi", "mn", "mz", "na"]

        translations = {"en": text}
        for lang in target_langs:
            try:
                translations[lang] = await self.translate(text, lang)
            except Exception as e:
                logger.warning(f"Translation to {lang} failed: {e}")
                translations[lang] = None

        return translations

    async def _translate_api(self, text: str, target_language_name: str) -> str:
        """
        Translate using LiteLLM (Gemini/GPT API) with automatic key rotation.

        Tries all available API keys in sequence. If one key fails (rate limit,
        expired, etc.), it's marked as failed and the next key is tried immediately.
        """
        try:
            from litellm import acompletion
        except ImportError:
            raise ImportError("litellm package not installed. Run: pip install litellm")

        from ..api_keys import key_manager

        keys_to_try = key_manager.get_all_keys_to_try()
        if not keys_to_try:
            raise ValueError(
                "No API keys available. Set GEMINI_API_KEYS (comma-separated) "
                "or GEMINI_API_KEY in your .env file."
            )

        messages = [
            {
                "role": "system",
                "content": (
                    f"You are a professional translator for disaster management communications in India's North Eastern Region. "
                    f"Translate the following English text to {target_language_name}. "
                    f"Use simple, clear language suitable for emergency alerts. "
                    f"Return ONLY the translated text, nothing else."
                ),
            },
            {"role": "user", "content": text},
        ]

        last_error = None
        for provider, model, api_key in keys_to_try:
            try:
                logger.info(f"Trying {provider} key ...{api_key[-6:]}")

                response = await acompletion(
                    model=model,
                    messages=messages,
                    api_key=api_key,
                    temperature=0.1,  # Low temperature for accurate translation
                    max_tokens=500,
                )

                # Key worked — mark it as healthy
                key_manager.mark_key_success(api_key)
                return response.choices[0].message.content.strip()

            except Exception as e:
                last_error = e
                error_msg = str(e).lower()
                # Check if this is a key-related failure (rate limit, auth, quota)
                is_key_error = any(
                    keyword in error_msg
                    for keyword in ["rate limit", "quota", "429", "401", "403", "invalid", "expired", "exhausted"]
                )

                if is_key_error:
                    logger.warning(
                        f"{provider} key ...{api_key[-6:]} failed ({e}). "
                        f"Rotating to next key..."
                    )
                    key_manager.mark_key_failed(api_key)
                else:
                    # Non-key error (network, server error, etc.) — don't blame the key
                    logger.error(f"Translation failed with non-key error: {e}")
                    raise

        # All keys exhausted
        raise RuntimeError(
            f"All API keys exhausted ({len(keys_to_try)} tried). "
            f"Last error: {last_error}"
        )

    def _translate_local(self, text: str, target_lang: str) -> str:
        """Translate using local IndicTrans2 model."""
        if self._local_model is None:
            raise RuntimeError("IndicTrans2 model not loaded. Initialize with backend='local'.")

        # IndicTrans2 language code mapping
        indic_lang_map = {
            "as": "asm_Beng",
            "hi": "hin_Deva",
            "mn": "mni_Mtei",
            "bn": "ben_Beng",
        }

        tgt_code = indic_lang_map.get(target_lang)
        if not tgt_code:
            raise ValueError(f"Language '{target_lang}' not supported by local IndicTrans2 model")

        # Tokenize and translate
        inputs = self._local_tokenizer(
            text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256,
        )

        # Generate translation
        generated = self._local_model.generate(
            **inputs,
            forced_bos_token_id=self._local_tokenizer.convert_tokens_to_ids(tgt_code),
            max_new_tokens=256,
        )

        translated = self._local_tokenizer.decode(generated[0], skip_special_tokens=True)
        return translated


# Singleton instance — uses API backend by default
translator = NERVATranslator(backend="api")
