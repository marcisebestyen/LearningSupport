import fitz
import google.generativeai as genai
from sqlalchemy.orm import Session
import models
import os


class DocumentService:
    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def extract_text(self, file_bytes: bytes) -> str:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return "".join([page.get_text() for page in doc])

    def generate_summary(self, text: str) -> str:
        prompt = f"""
        Analyze the following document. Output the summary explicitly in HUNGARIAN.
        Structure it for a student.
        Text: {text[:30000]}
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"AI Error: {e}")
            return "Hiba történt az összefoglaló generálása közben."

    def save_document(self, db: Session, filename: str, content: str, summary: str, user_id: int):
        new_doc = models.Document(
            filename=filename,
            content=content,
            summary=summary,
            owner_id=user_id
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        return new_doc

    def get_user_history(self, db: Session, user_id: int):
        return db.query(models.Document).filter(models.Document.owner_id == user_id).all()


class UserService:
    def create_user(self, db: Session, username: str, hashed_pass: str):
        user = models.User(username=username, hashed_password=hashed_pass)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def get_user_by_username(self, db: Session, username: str):
        return db.query(models.User).filter(models.User.username == username).first()
