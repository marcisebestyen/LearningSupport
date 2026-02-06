import os
import fitz
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv
import auth
import database
import schemas
import services
from database import engine
import models
from typing import List
from pydantic import BaseModel
from fastapi import Form

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    raise ValueError("API Key not found! Check your .env file.")

genai.configure(api_key=GOOGLE_API_KEY)

model = genai.GenerativeModel('gemini-2.5-flash')

try:
    with engine.connect() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        connection.commit()
    print("--- Database Connected ---")
except Exception as e:
    print(f"--- Database Connection Failed: {e} ---")

app = FastAPI()
doc_service = services.DocumentService()
user_service = services.UserService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_text_from_pdf(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text_content = ""
    for page in doc:
        text_content += page.get_text()
    return text_content


class ScoreSubmission(BaseModel):
    score: int


@app.post("/register")
def register(username: str, password: str, db: Session = Depends(database.get_db)):
    if user_service.get_user_by_username(db, username):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed = auth.hash_password(password)
    user_service.create_user(db, username, hashed)
    return {"message": "User created"}


@app.post("/login")
def login(username: str, password: str, db: Session = Depends(database.get_db)):
    user = user_service.get_user_by_username(db, username)
    if not user or not auth.verify_password(password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]

@app.post("/upload/")
async def upload_file(
        file: UploadFile = File(...),
        category: str = Form(None),
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: PDF, DOCX, PPTX. Got: {file.content_type}"
        )

    file_bytes = await file.read()
    try:
        content = doc_service.extract_text(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Extraction error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process file content")

    summary = doc_service.generate_summary(content)
    doc = doc_service.save_document(db, file.filename, content, summary, current_user.id, category)
    return doc


@app.get("/history", response_model=List[schemas.DocumentResponse])
def read_history(
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    return doc_service.get_user_history(db, current_user.id)

@app.delete("/delete/{doc_id}")
def delete_document(
        doc_id: int,
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    success = doc_service.delete_document(db, doc_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found or unauthorized")

    return {"message": "Document deleted successfully."}


@app.post("/documents/{doc_id}/quiz")
def create_quiz(
        doc_id: int,
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    quiz_service = services.QuizService(db)
    quiz = quiz_service.generate_quiz(doc_id, current_user.id)
    if not quiz:
        raise HTTPException(status_code=500, detail="Failed to generate quiz")
    return {"quiz_id": quiz.id}


@app.get("/quizzes")
def list_quizzes(
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    quiz_service = services.QuizService(db)
    quizzes = quiz_service.get_user_quizzes(current_user.id)
    return quizzes


@app.get("/quizzes/{quiz_id}")
def get_quiz(
        quiz_id: int,
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    print(f"\n--- DEBUGGING QUIZ {quiz_id} ---")
    print(f"Requesting User: {current_user.username} (ID: {current_user.id})")

    quiz_any_owner = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()

    if not quiz_any_owner:
        print("❌ RESULT: Quiz ID does not exist in the database.")
        raise HTTPException(status_code=404, detail="Quiz ID not found in DB")

    print(f"✅ Quiz found! It belongs to Owner ID: {quiz_any_owner.owner_id}")

    if quiz_any_owner.owner_id != current_user.id:
        print(f"❌ OWNERSHIP MISMATCH! User {current_user.id} tried to access Quiz owned by {quiz_any_owner.owner_id}")
        raise HTTPException(status_code=404, detail="Quiz not found (Ownership mismatch)")

    try:
        service_result = services.QuizService(db).get_quiz_by_id(quiz_id, current_user.id)
        if not service_result:
            print("❌ Service returned None (This implies the service query logic is broken)")
        else:
            print(f"✅ Service loaded quiz with {len(service_result.questions)} questions.")
            return service_result
    except Exception as e:
        print(f"❌ CRASH during service call: {e}")
        raise e

    raise HTTPException(status_code=404, detail="Unknown error in retrieval")


@app.post("/quizzes/{quiz_id}/submit")
def submit_quiz_score(
    quiz_id: int,
    submission: ScoreSubmission,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    quiz_service = services.QuizService(db)
    result = quiz_service.submit_score(quiz_id, submission.score, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return result

@app.post("/documents/{doc_id}/flashcards")
def create_flashcards(
        doc_id: int,
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    service = services.QuizService(db)
    set_id = service.generate_flashcards(doc_id, current_user.id)
    if not set_id:
        raise HTTPException(status_code=500, detail="Failed to generate flashcards")
    return {"set_id": set_id}

@app.get("/flashcards/{set_id}", response_model=List[schemas.Flashcard])
def get_flashcard(
        set_id: int,
        db: Session = Depends(database.get_db),
):
    service = services.QuizService(db)
    flash_set = service.get_flashcard_set(set_id)
    if not flash_set:
        raise HTTPException(status_code=404, detail="Failed to get flashcards")
    return flash_set.cards

@app.get("/flashcards-list", response_model=List[schemas.FlashcardSetResponse])
def list_flashcards(
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    service = services.QuizService(db)
    return service.get_user_flashcard_sets(current_user.id)

@app.post("/documents/{doc_id}/chat")
def chat_with_document(
        doc_id: int,
        chat_req: schemas.ChatRequest,
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    service = services.ChatService(db)
    answer = service.ask_document(doc_id, chat_req.question)
    return {"answer": answer}

@app.get("/documents/{doc_id}/chat", response_model=List[schemas.ChatMessageResponse])
def get_chat_history(
        doc_id: int,
        db: Session = Depends(database.get_db),
        current_user: models.User = Depends(auth.get_current_user)
):
    service = services.ChatService(db)
    return service.get_chat_history(doc_id)