from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())

    content = Column(Text, nullable=False)

    summary = Column(Text, nullable=True)

    embedding = Column(Vector(768), nullable=True)