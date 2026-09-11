from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/classify", tags=["AI/ML"])

@router.post("/image", dependencies=[Depends(get_current_user)])
async def classify_image(file: UploadFile = File(...)):
    """Upload a road damage photo and get AI-powered severity classification."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPEG or PNG)")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    from ..ml.image_classifier import image_classifier
    result = await image_classifier.classify(image_bytes)
    result["filename"] = file.filename
    return result

class TextClassifyRequest(BaseModel):
    text: str = Field(..., description="Incident description text to classify")
    incident_type: Optional[str] = Field(None, description="Optional: road_block, landslide, flood, etc.")

@router.post("/text", dependencies=[Depends(get_current_user)])
def classify_text(request: TextClassifyRequest):
    """Classify incident report text into severity levels."""
    from ..ml.text_classifier import text_classifier
    return text_classifier.classify(request.text, request.incident_type)
