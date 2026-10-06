from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserCreateRequest,
    UserResponse,
    UserUpdateRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate Admin or Chef and return signed JWT access token."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your manager.",
        )

    token_data = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name,
    }
    access_token = create_access_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get authenticated user profile."""
    return UserResponse.model_validate(current_user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Logout current user."""
    return {"message": "Logged out successfully", "user_id": current_user.id}


@router.get("/users", response_model=List[UserResponse])
def get_staff_and_chefs(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin view: Retrieve all staff members and chefs."""
    users = db.query(User).order_by(User.role.asc(), User.name.asc()).all()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_staff_or_chef(
    data: UserCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin view: Create a new staff or chef profile."""
    existing = db.query(User).filter(User.email == data.email.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A staff account with this email already exists",
        )

    new_user = User(
        email=data.email.strip(),
        name=data.name.strip(),
        password_hash=hash_password(data.password),
        role=data.role.upper(),
        shift=data.shift or "Morning",
        assigned_station=data.assigned_station or "Kitchen",
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse.model_validate(new_user)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_staff_or_chef(
    user_id: str,
    data: UserUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin view: Update a staff or chef's station, shift, role, or active status."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff user not found",
        )

    if data.name is not None:
        target_user.name = data.name.strip()
    if data.role is not None:
        target_user.role = data.role.upper()
    if data.shift is not None:
        target_user.shift = data.shift
    if data.assigned_station is not None:
        target_user.assigned_station = data.assigned_station
    if data.password:
        target_user.password_hash = hash_password(data.password)
    if data.is_active is not None:
        target_user.is_active = data.is_active

    db.commit()
    db.refresh(target_user)
    return UserResponse.model_validate(target_user)


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_staff_member(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin view: Delete or deactivate a staff/chef member."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff user not found",
        )
    if target_user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own active administrator account",
        )

    db.delete(target_user)
    db.commit()
    return {"message": f"Staff member '{target_user.name}' removed successfully"}

