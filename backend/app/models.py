from sqlalchemy import Column, Integer, String, DateTime, func
from .database import Base

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(20), nullable=False)
    content = Column(String(2000), nullable=False)
    character = Column(String(50), nullable=False, index=True) # Nueva columna para el personaje
    created_at = Column(DateTime(timezone=True), server_default=func.now())
