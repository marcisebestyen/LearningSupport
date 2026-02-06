from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False, unique=True, index=True)
    hashed_password = Column(String, nullable=False)

    documents = relationship("Document", back_populates="owner")
    quizzes = relationship("Quiz", back_populates="owner")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    embedding = Column(Vector(768), nullable=True)
    category = Column(String, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="documents")
    quizzes = relationship("Quiz", back_populates="document", cascade="all, delete-orphan")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    top_score = Column(Integer, default=0)
    passed = Column(Boolean, default=False)

    document_id = Column(Integer, ForeignKey("documents.id"))
    document = relationship("Document", back_populates="quizzes")

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="quizzes")

    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))

    question_text = Column(Text, nullable=False)
    question_type = Column(String, nullable=False)

    options = Column(JSON, nullable=False)
    correct_answer = Column(String, nullable=False)

    quiz = relationship("Quiz", back_populates="questions")