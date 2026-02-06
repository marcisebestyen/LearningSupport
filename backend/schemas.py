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