from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    shift: Optional[str] = "Morning"
    assigned_station: Optional[str] = "Main Kitchen"
    is_active: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "CHEF"  # ADMIN or CHEF
    shift: Optional[str] = "Morning"
    assigned_station: Optional[str] = "Hot Kitchen"


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    shift: Optional[str] = None
    assigned_station: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

