import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

const TOKEN_KEY = 'capg.jwt';

export interface AuthResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly token = signal<string | null>(this.getTokenFromStorage());

  constructor(private http: HttpClient) {}

  login(username: string, password: string) {
    return this.http
      // On remplace localhost par l'URL Render ici 👇
      .post<AuthResponse>('https://backend1-uj0j.onrender.com/api/auth/login', {
        username,
        password,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.token);
          this.token.set(res.token);
        }),
      );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }

  getToken() {
    return this.token();
  }

  private getTokenFromStorage() {
    return localStorage.getItem(TOKEN_KEY);
  }
}

