import fitz
import google.generativeai as genai
from sqlalchemy.orm import Session, joinedload
import models
import os
import json
from google.generativeai.types import GenerationConfig

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

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
        
        IMPORTANT FORMATTING RULES:
        1. Do NOT use code blocks (```) for the text.
        2. Use standard bullet points (*).
        3. Do NOT indent nested bullet points with more than 2 spaces.
        4. Use bolding (**text**) for key terms.
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

    def delete_document(self, db: Session, doc_id: int, user_id: int):
        doc = db.query(models.Document).filter(
            models.Document.id == doc_id,
            models.Document.owner_id == user_id
        ).first()

        if doc:
            db.delete(doc)
            db.commit()
            return True

        return False


class UserService:
    def create_user(self, db: Session, username: str, hashed_pass: str):
        user = models.User(username=username, hashed_password=hashed_pass)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def get_user_by_username(self, db: Session, username: str):
        return db.query(models.User).filter(models.User.username == username).first()


class QuizService:
    def __init__(self, db: Session = None):
        self.db = db
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def generate_quiz(self, document_id: int, user_id: int):
        doc: models.Document | None = self.db.query(models.Document).filter(
            models.Document.id == document_id,
            models.Document.owner_id == user_id
        ).first()

        if not doc:
            print(f"Error: Document {document_id} not found.")
            return None

        prompt = f"""
        Generate a quiz based on the text below.
        Language: HUNGARIAN.
        Format: JSON Array of objects.
        Quantity: 10 Questions.
        Types: Mix of "multiple_choice" and "true_false".

        Schema for each object:
        {{
            "question_text": "The question string",
            "type": "multiple_choice" OR "true_false",
            "options": ["Option A", "Option B", "Option C", "Option D"] (OR null if true_false),
            "correct_answer": "The exact string matching one of the options or 'Igaz'/'Hamis'"
        }}

        Ensure the "correct_answer" exactly matches one of the strings in "options".

        Text content:
        {doc.content[:30000]}
        """

        try:
            config = GenerationConfig(response_mime_type="application/json")
            response = self.model.generate_content(
                prompt,
                generation_config=config
            )

            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = raw_text.split("\n", 1)[1]
                if raw_text.endswith("```"):
                    raw_text = raw_text.rsplit("\n", 1)[0]

            quiz_data = json.loads(raw_text)

            if isinstance(quiz_data, dict):
                if "questions" in quiz_data:
                    quiz_data = quiz_data["questions"]
                elif "quiz" in quiz_data:
                    quiz_data = quiz_data["quiz"]
                else:
                    for val in quiz_data.values():
                        if isinstance(val, list):
                            quiz_data = val
                            break

            new_quiz = models.Quiz(
                document_id=doc.id,
                owner_id=user_id,
                top_score=0,
                passed=False
            )
            self.db.add(new_quiz)
            self.db.commit()
            self.db.refresh(new_quiz)

            for q_data in quiz_data:
                options = q_data.get('options')
                if q_data.get('type') == 'true_false' and not options:
                    options = ["Igaz", "Hamis"]

                question = models.Question(
                    quiz_id=new_quiz.id,
                    question_text=q_data['question_text'],
                    question_type=q_data['type'],
                    options=options,
                    correct_answer=q_data['correct_answer']
                )
                self.db.add(question)

            self.db.commit()
            print(f"--- Quiz Generated ID: {new_quiz.id} ---")
            return new_quiz

        except Exception as e:
            print(f"!!! Quiz Generation Error: {e}")
            return None


    def get_user_quizzes(self, user_id: int):
        quizzes = self.db.query(models.Quiz).options(
            joinedload(models.Quiz.document)
        ).filter(
            models.Quiz.owner_id == user_id
        ).order_by(models.Quiz.created_at.desc()).all()

        return [q for q in quizzes if q.document is not None]


    def get_quiz_by_id(self, quiz_id: int, user_id: int):
        return self.db.query(models.Quiz).options(
            joinedload(models.Quiz.questions)
        ).filter(
            models.Quiz.id == quiz_id,
            models.Quiz.owner_id == user_id
        ).first()


    def submit_score(self, quiz_id: int, score: int, user_id: int):
        quiz = self.db.query(models.Quiz).filter(
            models.Quiz.id == quiz_id,
            models.Quiz.owner_id == user_id
        ).first()

        if quiz:
            if score > quiz.top_score:
                quiz.top_score = score

            if score >= 5:
                quiz.passed = True

            self.db.commit()
            self.db.refresh(quiz)
            return quiz
        return None

