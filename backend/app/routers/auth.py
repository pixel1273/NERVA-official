from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from .. import auth
from ..database.db import get_connection
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class RegisterUser(BaseModel):
    phone: str
    name: str
    username: str
    password: str
    preferred_language: str
    user_type: str

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

@router.post("/send-otp")
def send_otp(req: OTPRequest):
    """Mock sending OTP (in app for now as it's a paid feature)."""
    # In a real app, integrate Twilio/AWS SNS here.
    # For now, return a fixed OTP or just success.
    return {"message": "OTP sent successfully to " + req.phone, "mock_otp": "123456"}

@router.post("/verify-otp")
def verify_otp(req: OTPVerify):
    """Mock verify OTP."""
    if req.otp == "123456":
        return {"status": "success", "message": "OTP verified"}
    raise HTTPException(status_code=400, detail="Invalid OTP")


@router.post("/register")
def register(user_data: RegisterUser):
    """Register a new user."""
    if user_data.user_type == "command":
        raise HTTPException(status_code=400, detail="Cannot register as command official")

    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if username or phone exists
    cursor.execute(
        "SELECT id FROM users WHERE username = %s OR phone = %s",
        (user_data.username, user_data.phone)
    )
    existing = cursor.fetchone()
    
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Username or phone already registered")
        
    hashed_pw = auth.get_password_hash(user_data.password)
    
    try:
        cursor.execute(
            """INSERT INTO users (phone, name, username, hashed_password, preferred_language, user_type)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (user_data.phone, user_data.name, user_data.username, hashed_pw, user_data.preferred_language, user_data.user_type)
        )
        new_id = cursor.fetchone()["id"]
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))
        
    conn.close()
    return {"message": "User registered successfully", "user_id": new_id}


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user and return JWT token."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE username = %s",
        (form_data.username,)
    )
    user = cursor.fetchone()
    conn.close()

    if not user or not auth.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile and role."""
    return {
        "username": user["username"],
        "name": user["name"],
        "user_type": user["user_type"],
        "preferred_language": user["preferred_language"]
    }
