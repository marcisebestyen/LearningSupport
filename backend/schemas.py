from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DocumentResponse(BaseModel):
    id: int
    filename: str
    summary: Optional[str] = None
    upload_date: datetime

    class Config:
        from_attributes = True