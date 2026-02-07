import io
import fitz
import google.generativeai as genai
from sqlalchemy.orm import Session, joinedload
import models
import os
import json
from google.generativeai.types import GenerationConfig
from docx import Document as DocxDocument
from pptx import Presentation
from sqlalchemy import text as sql_text

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

class DocumentService:
    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.embedding_model = "models/gemini-embedding-001"

    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        ext = filename.split('.')[-1].lower()
        if ext == 'pdf':
            return self._extract_from_pdf(file_bytes)
        elif ext == 'docx':
            return self._extract_from_docx(file_bytes)
        elif ext == 'pptx':
            return self._extract_from_pptx(file_bytes)
        else:
            raise ValueError(f"Unsupported file type: {ext}")


    def _extract_from_pdf(self, file_bytes: bytes):
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return "".join([page.get_text() for page in doc])

    def _extract_from_docx(self, file_bytes: bytes):
        cod = DocxDocument(io.BytesIO(file_bytes))
        return "\n".join([para.text for para in cod.paragraphs])

    def _extract_from_pptx(self, file_bytes: bytes):
        prs = Presentation(io.BytesIO(file_bytes))
        text_content = []

        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text_content.append(shape.text)

        return "\n".join(text_content)

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

    def save_document(self, db: Session, filename: str, content: str, summary: str, user_id: int, category: str = None):
        new_doc = models.Document(
            filename=filename,
            content=content,
            summary=summary,
            owner_id=user_id,
            category=category
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)

        chunks = self._chunk_text(content)
        for idx, chunk_text in enumerate(chunks):
            vector = self._get_embedding(chunk_text)

            db_chunk = models.DocumentChunk(
                document_id=new_doc.id,
                chunk_index=idx,
                content=chunk_text,
                embedding=vector,
            )
            db.add(db_chunk)

        db.commit()
        return new_doc

    def _chunk_text(self, text: str, chunk_size: int = 1000) -> list[str]:
        return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

    def _get_embedding(self, text: str):
        result = genai.embed_content(
            model=self.embedding_model,
            content=text,
            # task_type="retrieval_document"
            output_dimensionality=768
        )
        return result['embedding']

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


    def generate_flashcards(self, document_id: int, user_id: int):
        doc = self.db.query(models.Document).filter(
            models.Document.id == document_id,
            models.Document.owner_id == user_id
        ).first()
        if not doc:
            return None

        prompt = f"""
        Analyze the text below and generate 10 flashcards. 
        Output PURE JSON: [{{ "front": "term", "back": "definition" }}]
        Language: HUNGARIAN.
        Text: {doc.content[:30000]}
        """

        try:
            config = GenerationConfig(response_mime_type="application/json")
            response = self.model.generate_content(prompt, generation_config=config)
            cards_data = json.loads(response.text)

            new_set = models.FlashcardSet(document_id=doc.id)
            self.db.add(new_set)
            self.db.commit()
            self.db.refresh(new_set)

            for card in cards_data:
                db_card = models.Flashcard(set_id=new_set.id, front=card['front'], back=card['back'])
                self.db.add(db_card)

            self.db.commit()
            return new_set.id

        except Exception as e:
            print(f"!!! Flashcard Generation Error: {e}")
            return None


    def get_flashcard_set(self, set_id: int):
        return self.db.query(models.FlashcardSet).options(
            joinedload(models.FlashcardSet.cards)
        ).filter(models.FlashcardSet.id == set_id).first()


    def get_user_flashcard_sets(self, user_id: int):
        sets = self.db.query(models.FlashcardSet).join(models.Document).filter(
            models.Document.owner_id == user_id
        ).order_by(models.FlashcardSet.created_at.desc()).all()

        results = []
        for fset in sets:
            results.append({
                "id": fset.id,
                "created_at": fset.created_at,
                "document_filename": fset.document.filename,
                "card_count": len(fset.cards),
            })
        return results


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


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def ask_document(self, doc_id: int, question: str):
        usr_msg = models.ChatMessage(document_id=doc_id, role='user', content=question)
        self.db.add(usr_msg)
        self.db.commit()

        q_embedding = genai.embed_content(
            model='models/gemini-embedding-001',
            content=question,
            # task_type='retrieval_query'
            output_dimensionality=768
        )['embedding']

        query = sql_text("""
            SELECT content
            FROM document_chunks
            WHERE document_id = :doc_id
            ORDER BY embedding <=> :q_embedding
            LIMIT 3
        """)

        results = self.db.execute(query, {"doc_id": doc_id, "q_embedding": str(q_embedding)}).fetchall()
        context_text = "\n\n".join([row[0] for row in results])

        prompt = f"""
        You are a helpful tutor. Answer the question based ONLY on the context below.
        
        Context: 
        {context_text}
        
        Question: {question}
        Answer (in Hungarian):
        """

        response = self.model.generate_content(prompt)
        answer_text = response.text

        ai_msg = models.ChatMessage(document_id=doc_id, role='ai', content=answer_text)
        self.db.add(ai_msg)
        self.db.commit()

        return answer_text

    def get_chat_history(self, doc_id: int):
        return (self.db.query(models.ChatMessage)
                .filter(models.ChatMessage.document_id == doc_id)
                .order_by(models.ChatMessage.created_at.asc()).all())


class MindMapService:
    def __init__(self, db: Session):
        self.db = db
        self.model = genai.GenerativeModel('gemini-2.5-flash')


    def generate_mindmap(self, doc_id: int, user_id: int):
        doc = self.db.query(models.Document).filter(
            models.Document.id == doc_id,
            models.Document.owner_id == user_id
        ).first()

        if not doc:
            return None

        prompt = f"""
                Create a hierarchical mind map using Mermaid.js `graph TD` syntax.

                STRICT RULES:
                1. Use `graph TD` (Top-Down) layout.
                2. **Do NOT** use the `mindmap` keyword.
                3. **Shapes**:
                   - Use Double Circle for the Root Node: `A((Main Topic))`
                   - Use Rounded Edges for Branches: `B(Sub Topic)`
                   - Use Stadium Shape for Leaves: `C([Detail])`
                4. **Connections**: Use standard arrows `-->`.
                5. **Sanitization**: 
                   - Remove ALL special characters from labels: `( ) [ ] {{ }} " '`.
                   - Keep labels short (1-4 words).
                6. Language: HUNGARIAN.

                EXAMPLE OUTPUT:
                graph TD
                  Root((Biológia)) --> A(Sejtek)
                  Root --> B(Genetika)
                  A --> A1([Mitózis])
                  A --> A2([Meiózis])
                  B --> B1([DNS])

                Text to analyze:
                {doc.content[:30000]}
                """

        try:
            response = self.model.generate_content(prompt)
            script = response.text.strip()

            if script.startswith("```mermaid"):
                script = script.replace("```mermaid", "").replace("```", "")
            elif script.startswith("```"):
                script = script.replace("```", "")

            script = script.strip()

            if not script.startswith("graph"):
                script = "graph TD\n" + script

            new_map = models.MindMap(
                document_id=doc_id,
                mermaid_script=script
            )
            self.db.add(new_map)
            self.db.commit()
            self.db.refresh(new_map)

            return new_map

        except Exception as e:
            print(f"!!! MindMap Generation Error: {e}")
            return None


    def get_mindmap_by_doc(self, doc_id: int, user_id: int):
        return self.db.query(models.MindMap).join(models.Document).filter(
            models.MindMap.document_id == doc_id,
            models.Document.owner_id == user_id
        ).first()


    def get_user_mindmaps(self, user_id: int):
        return self.db.query(models.MindMap).join(models.Document).filter(
            models.Document.owner_id == user_id
        ).order_by(models.MindMap.created_at.desc()).all()
