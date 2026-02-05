import { Injectable, signal, computed } from '@angular/core';
import { HttpRequestService } from './http-request.service';
import { tap } from 'rxjs';

@Injectable({providedIn: 'root'})
export class AuthService {
  token = signal<string | null>(localStorage.getItem('token'));
  isLoggedIn = computed(() => !!this.token());

  constructor(private httpService: HttpRequestService) { }

  register(username: string, password: string) {
    return this.httpService.registerRequest(username, password);
  }

  login(username: string, password: string) {
    return this.httpService.loginRequest(username, password)
      .pipe(tap(res => {
        localStorage.setItem('token', res.access_token);
        this.token.set(res.access_token);
      }));
  }

  logout() {
    localStorage.removeItem('token');
    this.token.set(null);
  }
}
