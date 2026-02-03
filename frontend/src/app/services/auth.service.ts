import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({providedIn: 'root'})
export class AuthService {
  private apiUrl = "http://127.0.0.1:8000";

  token = signal<string | null>(localStorage.getItem("token"));
  isLoggedIn = computed(() => !!this.token());

  constructor(private http: HttpClient) { }

  register(username: string, password: string) {
    return this.http.post(`${this.apiUrl}/register?username=${username}&password=${password}`, {});
  }

  login(username: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/login?username=${username}&password=${password}`, {})
      .pipe(tap(res => {
        localStorage.setItem("token", res.access_token);
        this.token.set(res.access_token);
      }));
  }

  logout() {
    localStorage.removeItem("token");
    this.token.set(null);
  }
}
