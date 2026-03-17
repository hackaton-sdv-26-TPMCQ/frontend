import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="strip">
        <span class="logo">Capgemini</span>
        <span class="tagline">Empreinte Carbone — Hackathon 2026</span>
      </div>
      <div class="card">
        <h1>Connexion</h1>
        <p class="intro">Accédez au tableau de bord de calcul d’empreinte carbone des sites.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            <span class="label-text">Identifiant</span>
            <input formControlName="username" placeholder="admin" autocomplete="username" />
          </label>
          <label>
            <span class="label-text">Mot de passe</span>
            <input type="password" formControlName="password" placeholder="••••••••" autocomplete="current-password" />
          </label>
          <p class="error" *ngIf="error()">{{ error() }}</p>
          <button type="submit" class="btn-primary" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>
        <p class="hint">Compte de démonstration : <strong>admin</strong> / <strong>admin</strong></p>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px 24px;
        background: var(--cap-bg);
      }
      .strip {
        width: 100%;
        max-width: 440px;
        background: var(--cap-blue);
        color: white;
        padding: 20px 24px;
        border-radius: var(--cap-radius-lg) var(--cap-radius-lg) 0 0;
        text-align: center;
      }
      .logo {
        display: block;
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      .tagline {
        display: block;
        font-size: 0.85rem;
        opacity: 0.95;
        margin-top: 4px;
      }
      .card {
        width: 100%;
        max-width: 440px;
        background: var(--cap-card);
        border: 1px solid var(--cap-border);
        border-top: none;
        border-radius: 0 0 var(--cap-radius-lg) var(--cap-radius-lg);
        padding: 28px 24px;
        box-shadow: var(--cap-shadow-md);
      }
      h1 {
        margin: 0 0 6px;
        font-size: 1.35rem;
        color: var(--cap-text);
      }
      .intro {
        margin: 0 0 20px;
        font-size: 0.9rem;
        color: var(--cap-text-muted);
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
      }
      .label-text {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--cap-text);
      }
      input {
        padding: 12px 14px;
        border-radius: var(--cap-radius);
        border: 1px solid var(--cap-border);
        background: var(--cap-card);
        color: var(--cap-text);
        font-size: 1rem;
      }
      input::placeholder {
        color: var(--cap-text-muted);
      }
      input:focus {
        outline: none;
        border-color: var(--cap-blue);
        box-shadow: 0 0 0 3px rgba(0, 112, 173, 0.15);
      }
      .btn-primary {
        width: 100%;
        margin-top: 8px;
        padding: 12px 16px;
        border-radius: var(--cap-radius);
        border: 0;
        background: var(--cap-blue);
        color: white;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.2s;
      }
      .btn-primary:hover:not(:disabled) {
        background: var(--cap-blue-hover);
      }
      .btn-primary[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .error {
        color: var(--cap-error);
        font-size: 0.9rem;
        margin: 8px 0 0;
      }
      .hint {
        margin-top: 20px;
        font-size: 0.85rem;
        color: var(--cap-text-muted);
        text-align: center;
      }
    `,
  ],
})
export class LoginPage {
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      username: ['admin', [Validators.required]],
      password: ['admin', [Validators.required]],
    });
  }

  form;

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { username, password } = this.form.value;
    this.auth.login(username!, password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/sites');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Identifiants invalides ou backend non démarré.');
      },
    });
  }
}
