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

  uploadFileRequest(file: File, category: string = '', force: boolean = false) {
    const formData = new FormData();
    formData.append('file', file);

    if (category && category.trim() !== '') {
      formData.append('category', category);
    }

    formData.append('force_upload', String(force));

    return this.http.post<any>(`${this.baseUrl}/upload/`, formData, { headers: this.getHeaders() });
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

  loadChatHistoryRequest(docId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/documents/${docId}/chat`, { headers: this.getHeaders() });
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
}
