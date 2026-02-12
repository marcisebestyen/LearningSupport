import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class HttpRequestService {
  private readonly baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
    })
  }

  // auth services

  registerRequest(username: string, password: string) {
    return this.http.post(`${this.baseUrl}/register?username=${username}&password=${password}`, {});
  }

  loginRequest(username: string, password: string) {
    return this.http.post<any>(`${this.baseUrl}/login?username=${username}&password=${password}`, {});
  }


  // document services

  uploadFileRequest(file: File, category: string, studyFocus: string, force: boolean) {
    const formData = new FormData();
    formData.append('file', file);

    if (category) {
      formData.append('category', category);
    }

    if (studyFocus) {
      formData.append('study_focus', studyFocus);
    }

    if (force) {
      formData.append('force_upload', 'true');
    }

    return this.http.post<any>(`${this.baseUrl}/upload`, formData, { headers: this.getHeaders() });
  }

  loadHistoryRequest() {
    return this.http.get<any>(`${this.baseUrl}/documents`, { headers: this.getHeaders() });
  }

  deleteDocRequest(item: any) {
    return this.http.delete(`${this.baseUrl}/documents/${item.id}`, { headers: this.getHeaders() });
  }

  // quiz services

  generateQuizRequest(docId: number){
    return this.http.post<any>(`${this.baseUrl}/documents/${docId}/quizzes`, {}, { headers: this.getHeaders() });
  }

  loadQuizzesRequest(){
    return this.http.get<any[]>(`${this.baseUrl}/quizzes`, { headers: this.getHeaders() });
  }

  loadQuizRequest(quizId: string) {
    return this.http.get(`${this.baseUrl}/quizzes/${quizId}`, { headers: this.getHeaders() });
  }

  submitQuizRequest(quizId: string, score: number) {
    return this.http.post(`${this.baseUrl}/quizzes/${quizId}/submit`, { score: score }, { headers: this.getHeaders() });
  }

  // flashcard services

  generateFlashcardRequest(docId: number) {
    return this.http.post<any>(`${this.baseUrl}/documents/${docId}/flashcards`, {}, { headers: this.getHeaders() });
  }

  loadFlashcardsRequest() {
    return this.http.get<any[]>(`${this.baseUrl}/flashcards`, { headers: this.getHeaders() });
  }

  getFlashcardSetRequest(setId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/flashcards/${setId}`, { headers: this.getHeaders() });
  }

  // mindmap services

  generateMindMapRequest(docId: number) {
    return this.http.post<any>(`${this.baseUrl}/documents/${docId}/mindmaps`, {}, { headers: this.getHeaders() });
  }

  loadMindMapsRequest() {
    return this.http.get<any[]>(`${this.baseUrl}/mindmaps`, { headers: this.getHeaders() });
  }

  getMindMapRequest(mapId: string) {
    return this.http.get<any>(`${this.baseUrl}/mindmaps/${mapId}`, { headers: this.getHeaders() });
  }

  // chat services

  chatWithDocRequest(docId: number, question: string) {
    return this.http.post<any>(`${this.baseUrl}/documents/${docId}/chat`, { question }, { headers: this.getHeaders() });
  }

  loadChatHistoryRequest(docId: number, mode: 'chat' | 'tutor' = 'chat') {
    return this.http.get<any[]>(`${this.baseUrl}/documents/${docId}/chat?mode=${mode}`, { headers: this.getHeaders() });
  }

  startTutorSessionRequest(docId: number) {
    return this.http.post<any>(`${this.baseUrl}/documents/${docId}/tutor/start`, {}, { headers: this.getHeaders() });
  }

  replyToTutorRequest(docId: number, answer: string) {
    return this.http.post<any>(`${this.baseUrl}/documents/${docId}/tutor/reply`, { question: answer }, { headers: this.getHeaders() });
  }

  resetTutorSessionRequest(docId: number) {
    return this.http.delete(`${this.baseUrl}/documents/${docId}/tutor/reset`, { headers: this.getHeaders() });
  }

  // audio services

  generateDocumentAudioRequest(docId: number) {
    return this.http.post<any>(`${this.baseUrl}/documents/${docId}/generate-audio`, {}, { headers: this.getHeaders() });
  }

  loadAudiosRequest() {
    return this.http.get<any[]>(`${this.baseUrl}/audios`, { headers: this.getHeaders() });
  }

  playAudioRequest(docId: number) {
    return this.http.get(`${this.baseUrl}/audios/${docId}/play`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // grader / essay services

  gradeEssayTextRequest(docId: number, text: string) {
    return this.http.post<any>(`${this.baseUrl}/documents/${docId}/essay/grade`, { essay_text: text }, { headers: this.getHeaders() });
  }

  gradeEssayFileRequest(docId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(`${this.baseUrl}/documents/${docId}/essay/upload_grade`, formData, { headers: this.getHeaders() });
  }

  getEssayDetailRequest(essayId: number) {
    return this.http.get<any>(`${this.baseUrl}/essays/${essayId}`, { headers: this.getHeaders() });
  }

  getAllEssaysRequest() {
    return this.http.get<any[]>(`${this.baseUrl}/essays`, { headers: this.getHeaders() });
  }

  // study plan services

  getStudyPlansRequest() {
    return this.http.get<any[]>(`${this.baseUrl}/study-plans`, { headers: this.getHeaders() });
  }

  getStudyPlanRequest(docId: number) {
    return this.http.get<any>(`${this.baseUrl}/study-plans/${docId}`, { headers: this.getHeaders() });
  }

  createStudyPlanRequest(docId: number) {
    return this.http.post<any>(`${this.baseUrl}/documents/${docId}/plan`, {}, { headers: this.getHeaders() });
  }
}
