from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)  # weight | volume | count
    price_per_base_unit: Mapped[float] = mapped_column(Float, nullable=False)
    display_unit: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    recipe_items: Mapped[list["RecipeItem"]] = relationship(
        back_populates="ingredient", lazy="selectin"
    )


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    portions: Mapped[int] = mapped_column(Integer, nullable=False)
    sell_price: Mapped[float] = mapped_column(Float, nullable=False)
    target_margin_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    recipe_items: Mapped[list["RecipeItem"]] = relationship(
        back_populates="menu_item", cascade="all, delete-orphan", lazy="selectin"
    )


class RecipeItem(Base):
    __tablename__ = "recipe_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.id", ondelete="CASCADE"))
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id", ondelete="RESTRICT"))
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    input_unit: Mapped[str] = mapped_column(String, nullable=False)

    menu_item: Mapped["MenuItem"] = relationship(back_populates="recipe_items")
    ingredient: Mapped["Ingredient"] = relationship(back_populates="recipe_items", lazy="selectin")
