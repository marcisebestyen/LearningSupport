from pydantic import BaseModel
from datetime import datetime
from typing import List, Literal

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
    has_audio: bool = False

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        data = super().from_orm(obj)
        data.has_audio = bool(obj.google_drive_id)
        return data


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
    document_filename: str

    class Config:
        from_attributes = True


class EssaySubmitRequest(BaseModel):
    essay_text: str


class GradeSegment(BaseModel):
    segment_text: str
    status: Literal['correct', 'partial', 'incorrect']
    feedback: str


class EssayGradeResponse(BaseModel):
    id: int
    overall_score: int
    general_feedback: str
    detailed_analysis: List[GradeSegment]
    created_at: datetime
    document_filename: str | None = None

    class Config:
        from_attributes = True