import re
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.accounts.models import User
from app.modules.accounts.schemas import CreateChefRequest, UpdateChefRequest


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_phone(db: Session, phone: str) -> Optional[User]:
    cleaned = phone.strip()
    return db.query(User).filter(User.contact_number == cleaned).first()


def get_user_by_identifier(db: Session, identifier: str) -> Optional[User]:
    ident = identifier.strip()
    if not ident:
        return None
    # 1. Try by contact_number directly
    digits = re.sub(r"\D", "", ident)
    if len(digits) == 10:
        by_phone = db.query(User).filter(User.contact_number == digits).first()
        if by_phone:
            return by_phone
        # Also check synthetic email for phone accounts: <digits>@vaanvibes.com
        by_synthetic = db.query(User).filter(User.email == f"{digits}@vaanvibes.com").first()
        if by_synthetic:
            return by_synthetic
    # 2. Try by email
    return db.query(User).filter(User.email == ident.lower()).first()


def get_chefs(db: Session) -> List[User]:
    return (
        db.query(User)
        .filter(User.role == "CHEF")
        .order_by(User.created_at.desc())
        .all()
    )


def create_chef(db: Session, payload: CreateChefRequest) -> User:
    clean_email = payload.email.lower().strip()
    clean_role = payload.role.upper().strip() if payload.role else "CHEF"
    if clean_role not in ["CHEF", "ADMIN"]:
        clean_role = "CHEF"

    chef = User(
        email=clean_email,
        name=payload.name.strip(),
        contact_number=payload.contact_number.strip(),
        password_hash=hash_password(payload.password),
        role=clean_role,
        assigned_station=payload.assigned_station.strip() if payload.assigned_station else "Main Kitchen",
        shift=payload.shift.strip() if payload.shift else "Morning",
        is_active=True,
    )
    db.add(chef)
    db.commit()
    db.refresh(chef)
    return chef


def update_chef(db: Session, chef: User, payload: UpdateChefRequest) -> User:
    chef.name = payload.name.strip()
    chef.email = payload.email.lower().strip()
    chef.contact_number = payload.contact_number.strip()
    if payload.role:
        chef.role = payload.role.upper().strip()
    if payload.password and payload.password.strip():
        chef.password_hash = hash_password(payload.password.strip())
    if payload.shift is not None:
        chef.shift = payload.shift.strip()
    if payload.assigned_station is not None:
        chef.assigned_station = payload.assigned_station.strip()
    if payload.is_active is not None:
        chef.is_active = payload.is_active

    db.commit()
    db.refresh(chef)
    return chef


def delete_chef(db: Session, chef: User) -> None:
    db.delete(chef)
    db.commit()


def update_password(db: Session, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)


def update_profile(db: Session, user: User, name: str, contact_number: Optional[str]) -> User:
    user.name = name.strip()
    if contact_number is not None:
        user.contact_number = contact_number.strip()
    db.commit()
    db.refresh(user)
    return user
