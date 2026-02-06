import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class HttpRequestService {
  private readonly baseUrl = 'http://127.0.0.1:8000';

  constructor(private http: HttpClient) { }

  // auth services

  registerRequest(username: string, password: string) {
    return this.http.post(`${this.baseUrl}/register?username=${username}&password=${password}`, {});
  }

  loginRequest(username: string, password: string) {
    return this.http.post<any>(`${this.baseUrl}/login?username=${username}&password=${password}`, {});
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
    })
  }

  // document services

  uploadFileRequest(file: File, category: string = '') {
    const formData = new FormData();
    formData.append('file', file);

    if (category && category.trim() !== '') {
      formData.append('category', category);
    }

    return this.http.post<any>(`${this.baseUrl}/upload/`, formData, { headers: this.getHeaders() });
  }

  loadHistoryRequest() {
    return this.http.get<any>(`${this.baseUrl}/history`);
  }

  deleteDocRequest(item: any) {
    return this.http.delete(`http://127.0.0.1:8000/delete/${item.id}`);
  }

  // quiz services

  generateQuizRequest(docId: number){
    return this.http.post<any>(`http://127.0.0.1:8000/documents/${docId}/quiz`, {});
  }

  loadQuizRequest(id: string) {
    return this.http.get(`http://127.0.0.1:8000/quizzes/${id}`);
  }

  loadQuizzesRequest(){
    return this.http.get<any[]>(`${this.baseUrl}/quizzes`);
  }

  submitQuizRequest(quizId: string, score: number) {
    return this.http.post(`http://127.0.0.1:8000/quizzes/${quizId}/submit`, { score: score });
  }
}
