from pydantic import BaseModel
from datetime import datetime

class DocumentBase(BaseModel):
    filename: str
    content: str
    summary: str | None = None
    category: str | None = None

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: int
    upload_date: datetime
    category: str | None = None

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str

class ChatMessageResponse(BaseModel):
    role: str
    content: str

class Flashcard(BaseModel):
    front: str
    back: str

class FlashcardSetResponse(BaseModel):
    id: int
    created_at: datetime
    card_count: int
    document_filename: str

    class Config:
        from_attributes = True

class MindMapResponse(BaseModel):
    id: int
    document_id: int
    mermaid_script: str
    created_at: datetime

    class Config:
        from_attributes = True