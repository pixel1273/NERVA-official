from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/translate", tags=["AI/ML"])

class TranslateRequest(BaseModel):
    text: str = Field(..., description="English text to translate")
    target_langs: Optional[List[str]] = Field(None, description="Language codes: as, hi, mn, mz, na, bn")

@router.post("", dependencies=[Depends(get_current_user)])
async def translate_text(request: TranslateRequest):
    """Translate English text to NER regional languages using AI."""
    from ..ml.translator import translator
    try:
        translations = await translator.translate_all(request.text, request.target_langs)
        return {"original": request.text, "translations": translations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")
