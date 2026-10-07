import json
import os
import sys
from datetime import datetime, timezone

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, engine
from app.modules.accounts.models import User
from app.modules.menu.models import Category, MenuItem
from app.modules.settings.models import CafeSettings
from app.modules.tables.models import Table
from app.modules.sessions.models import DiningSession, BillingInvoice
from app.modules.orders.models import Order, OrderItem


def seed_database():
    print("Cleaning database tables (preserving users)...")
    Base.metadata.create_all(bind=engine)

    # Delete existing data across all tables in reverse topological order,
    # keeping users and alembic_version intact
    with engine.begin() as conn:
        for tbl in reversed(Base.metadata.sorted_tables):
            if tbl.name == "users":
                continue
            conn.execute(tbl.delete())

    db = SessionLocal()

    try:
        # 0. Seed Default Users if missing
        print("Ensuring default admin & chef accounts...")
        admin1_phone = "9773291261"
        admin2_phone = "9054032800"

        # Admin 1
        admin_user_1 = db.query(User).filter(
            (User.email == f"{admin1_phone}@vaanvibes.com") | (User.contact_number == admin1_phone)
        ).first()
        if not admin_user_1:
            admin_user_1 = User(
                email=f"{admin1_phone}@vaanvibes.com",
                name="Admin (9773291261)",
                contact_number=admin1_phone,
                password_hash=hash_password("admin123"),
                role="ADMIN",
                shift="All Day",
                assigned_station="Management",
                is_active=True,
            )
            db.add(admin_user_1)
        else:
            admin_user_1.role = "ADMIN"
            admin_user_1.contact_number = admin1_phone
            admin_user_1.is_active = True

        # Admin 2
        admin_user_2 = db.query(User).filter(
            (User.email == f"{admin2_phone}@vaanvibes.com") | (User.contact_number == admin2_phone)
        ).first()
        if not admin_user_2:
            admin_user_2 = User(
                email=f"{admin2_phone}@vaanvibes.com",
                name="Admin (9054032800)",
                contact_number=admin2_phone,
                password_hash=hash_password("admin123"),
                role="ADMIN",
                shift="All Day",
                assigned_station="Management",
                is_active=True,
            )
            db.add(admin_user_2)
        else:
            admin_user_2.role = "ADMIN"
            admin_user_2.contact_number = admin2_phone
            admin_user_2.is_active = True

        # Ensure legacy email admin also exists for backward compatibility
        admin_user = db.query(User).filter(User.email == "admin@vaanvibes.com").first()
        if not admin_user:
            admin_user = User(
                email="admin@vaanvibes.com",
                name="Admin Manager",
                contact_number=admin1_phone,
                password_hash=hash_password("admin123"),
                role="ADMIN",
                shift="All Day",
                assigned_station="Management",
                is_active=True,
            )
            db.add(admin_user)

        chef_user = db.query(User).filter(User.email == "chef@vaanvibes.com").first()
        if not chef_user:
            chef_user = User(
                email="chef@vaanvibes.com",
                name="Master Chef",
                password_hash=hash_password("chef123"),
                role="CHEF",
                shift="Morning",
                assigned_station="Main Kitchen",
                is_active=True,
            )
            db.add(chef_user)
        db.flush()
        # 1. Cafe Settings (1)
        print("Seeding Cafe Settings (1)...")
        settings_record = CafeSettings(
            id=settings.CAFE_ID,
            name=settings.CAFE_NAME,
            hindi_name=settings.CAFE_HINDI_NAME,
            tagline=settings.CAFE_TAGLINE,
            address=settings.CAFE_ADDRESS,
            phone=settings.CAFE_PHONE,
            gstin=settings.CAFE_GSTIN,
            tax_rate=settings.CAFE_TAX_RATE,
            currency=settings.CAFE_CURRENCY,
        )
        db.add(settings_record)
        db.flush()

        # 2. Tables (12 Cafe Tables, all AVAILABLE)
        print("Seeding Tables (12)...")
        for i in range(1, 13):
            pad = f"{i:02d}"
            table_id = f"T{pad}"
            token = f"vv_sec_{table_id.lower()}_{(i * 7393 + 19283):x}"
            capacity = 2 if i <= 4 else (4 if i <= 8 else 6)
            t = Table(
                id=table_id,
                table_number=i,
                name=f"Table {pad}",
                token=token,
                capacity=capacity,
                status="AVAILABLE",
                is_active=True,
            )
            db.add(t)
        db.flush()

        # 3. Categories (19) & Menu Items (112) from seed_menu.json
        print("Seeding Categories (19) & Menu Items (112) from seed_menu.json...")
        json_path = os.path.join(os.path.dirname(__file__), "seed_menu.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Insert categories (excluding "all" which is a virtual filter)
            cats = [c for c in data.get("categories", []) if c.get("id") != "all"]
            for idx, c in enumerate(cats):
                cat_obj = Category(
                    id=c["id"],
                    name=c["name"],
                    slug=c.get("slug", c["id"]),
                    icon=c.get("icon", "🍽️"),
                    page=c.get("page", 2),
                    display_order=idx + 1,
                    is_active=True,
                )
                db.add(cat_obj)
            db.flush()

            # Insert menu items
            for item in data.get("items", []):
                m_obj = MenuItem(
                    id=item["id"],
                    category_id=item["category"],
                    name=item["name"],
                    price=float(item["price"]),
                    description=item.get("description"),
                    is_veg=bool(item.get("isVeg", True)),
                    image=item.get("image"),
                    popular=bool(item.get("popular", False)),
                    is_available=True,
                    options=item.get("options"),
                    add_ons=item.get("addOns"),
                )
                db.add(m_obj)
            db.flush()
        else:
            print("Warning: seed_menu.json not found!")

        db.commit()
        print("Database seeding completed successfully! Only requested tables populated.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
