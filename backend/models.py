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
    essays = relationship("EssaySubmission", back_populates="owner")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    embedding = Column(Vector(768), nullable=True)
    category = Column(String, nullable=True)
    google_drive_id = Column(String, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="documents")
    quizzes = relationship("Quiz", back_populates="document", cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="document", cascade="all, delete-orphan")
    flashcard_sets = relationship("FlashcardSet", back_populates="document", cascade="all, delete-orphan")
    mind_maps = relationship("MindMap", back_populates="document", cascade="all, delete-orphan")
    essays = relationship("EssaySubmission", back_populates="document", cascade="all, delete-orphan")


class EssaySubmission(Base):
    __tablename__ = "essay_submissions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))

    essay_content = Column(Text, nullable=False)
    feedback_json = Column(JSON, nullable=False)
    overall_score = Column(Integer, default=0)
    general_feedback = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="essays")
    owner = relationship("User", back_populates="essays")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    role = Column(String)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="messages")


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


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    chunk_index = Column(Integer)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(768))

    document = relationship("Document", back_populates="chunks")


class FlashcardSet(Base):
    __tablename__ = "flashcard_sets"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="flashcard_sets")
    cards = relationship("Flashcard", back_populates="flashcard_set", cascade="all, delete-orphan")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    set_id = Column(Integer, ForeignKey("flashcard_sets.id"))
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)

    flashcard_set = relationship("FlashcardSet", back_populates="cards")


class MindMap(Base):
    __tablename__ = "mind_maps"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    mermaid_script = Column(Text, nullable=False)

    document = relationship("Document", back_populates="mind_maps")