import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SiteApiService, SiteResponse, SiteComparisonResponse } from '../../sites/site-api.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-compare-page',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <span class="logo">Capgemini</span>
          <span class="app-name">Comparer des sites</span>
        </div>
        <div class="actions">
          <a routerLink="/sites" class="btn-ghost">Sites</a>
          <button type="button" class="btn-ghost" (click)="logout()">Déconnexion</button>
        </div>
      </header>

      <main class="main">
        <div class="card picker">
          <h2>Choisir deux sites</h2>
          <p class="card-desc">Sélectionnez deux sites pour comparer leurs indicateurs CO₂.</p>
          <div class="row" *ngIf="sites().length >= 2">
            <label>
              <span class="label-text">Site A</span>
              <select [value]="siteAId()" (change)="siteAId.set(+$any($event.target).value)">
                <option [value]="0">-- Choisir --</option>
                <option *ngFor="let s of sites()" [value]="s.id">{{ s.nom }} ({{ s.localisation }})</option>
              </select>
            </label>
            <label>
              <span class="label-text">Site B</span>
              <select [value]="siteBId()" (change)="siteBId.set(+$any($event.target).value)">
                <option [value]="0">-- Choisir --</option>
                <option *ngFor="let s of sites()" [value]="s.id">{{ s.nom }} ({{ s.localisation }})</option>
              </select>
            </label>
            <button
              type="button"
              class="btn-primary"
              [disabled]="!canCompare() || loading()"
              (click)="runCompare()"
            >
              {{ loading() ? 'Chargement…' : 'Comparer' }}
            </button>
          </div>
          <p class="muted" *ngIf="sites().length < 2">
            Enregistrez au moins deux sites depuis la page Sites pour pouvoir les comparer.
          </p>
          <p class="error" *ngIf="error()">{{ error() }}</p>
        </div>

        <div class="card result" *ngIf="comparison()">
          <h2>Résultat de la comparaison</h2>
          <div class="two-cols">
            <div class="col">
              <h3>{{ comparison()!.siteA.nom }}</h3>
              <p class="meta">{{ comparison()!.siteA.localisation }} — {{ comparison()!.siteA.annee }}</p>
              <div class="kpis">
                <div class="kpi"><span class="k">CO₂ total</span> <span class="v">{{ comparison()!.siteA.co2TotalKg | number: '1.0-0' }} kg</span></div>
                <div class="kpi"><span class="k">CO₂ / m²</span> <span class="v">{{ comparison()!.siteA.co2ParM2 | number: '1.2-2' }}</span></div>
                <div class="kpi"><span class="k">CO₂ / employé</span> <span class="v">{{ comparison()!.siteA.co2ParEmploye | number: '1.2-2' }}</span></div>
              </div>
            </div>
            <div class="col diff">
              <h3>Écarts (B − A)</h3>
              <div class="kpis">
                <div class="kpi">
                  <span class="k">CO₂ total</span>
                  <span class="v" [class.neg]="comparison()!.diffCo2TotalKg < 0" [class.pos]="comparison()!.diffCo2TotalKg > 0">
                    {{ comparison()!.diffCo2TotalKg >= 0 ? '+' : '' }}{{ comparison()!.diffCo2TotalKg | number: '1.0-0' }} kg
                  </span>
                </div>
                <div class="kpi">
                  <span class="k">CO₂ / m²</span>
                  <span class="v" [class.neg]="comparison()!.diffCo2ParM2 < 0" [class.pos]="comparison()!.diffCo2ParM2 > 0">
                    {{ comparison()!.diffCo2ParM2 >= 0 ? '+' : '' }}{{ comparison()!.diffCo2ParM2 | number: '1.2-2' }}
                  </span>
                </div>
                <div class="kpi">
                  <span class="k">CO₂ / employé</span>
                  <span class="v" [class.neg]="comparison()!.diffCo2ParEmploye < 0" [class.pos]="comparison()!.diffCo2ParEmploye > 0">
                    {{ comparison()!.diffCo2ParEmploye >= 0 ? '+' : '' }}{{ comparison()!.diffCo2ParEmploye | number: '1.2-2' }}
                  </span>
                </div>
              </div>
            </div>
            <div class="col">
              <h3>{{ comparison()!.siteB.nom }}</h3>
              <p class="meta">{{ comparison()!.siteB.localisation }} — {{ comparison()!.siteB.annee }}</p>
              <div class="kpis">
                <div class="kpi"><span class="k">CO₂ total</span> <span class="v">{{ comparison()!.siteB.co2TotalKg | number: '1.0-0' }} kg</span></div>
                <div class="kpi"><span class="k">CO₂ / m²</span> <span class="v">{{ comparison()!.siteB.co2ParM2 | number: '1.2-2' }}</span></div>
                <div class="kpi"><span class="k">CO₂ / employé</span> <span class="v">{{ comparison()!.siteB.co2ParEmploye | number: '1.2-2' }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .shell { min-height: 100dvh; background: var(--cap-bg); color: var(--cap-text); }
      .topbar {
        display: flex; justify-content: space-between; align-items: center;
        padding: 14px 24px; background: var(--cap-blue); color: white;
        box-shadow: var(--cap-shadow);
      }
      .brand { display: flex; align-items: baseline; gap: 12px; }
      .logo { font-weight: 800; font-size: 1.2rem; letter-spacing: 0.02em; }
      .app-name { font-size: 0.95rem; opacity: 0.95; }
      .actions { display: flex; gap: 10px; align-items: center; }
      .btn-ghost {
        background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.35);
        color: white; padding: 8px 14px; border-radius: var(--cap-radius);
        cursor: pointer; font-size: 0.9rem; font-weight: 600; text-decoration: none;
      }
      .btn-ghost:hover { background: rgba(255,255,255,0.25); }
      .btn-primary {
        padding: 10px 20px; border-radius: var(--cap-radius); border: 0;
        background: var(--cap-blue); color: white; font-weight: 700; cursor: pointer;
      }
      .btn-primary:hover:not(:disabled) { background: var(--cap-blue-hover); }
      .btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
      .main { padding: 24px; max-width: 1100px; margin: 0 auto; }
      .card {
        background: var(--cap-card); border: 1px solid var(--cap-border);
        border-radius: var(--cap-radius-lg); padding: 20px; margin-bottom: 20px;
        box-shadow: var(--cap-shadow);
      }
      .card-desc { margin: 0 0 16px; font-size: 0.9rem; color: var(--cap-text-muted); }
      .row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; }
      label { display: flex; flex-direction: column; gap: 6px; }
      .label-text { font-size: 0.875rem; font-weight: 600; color: var(--cap-text); }
      select {
        padding: 10px 12px; border-radius: var(--cap-radius); border: 1px solid var(--cap-border);
        background: var(--cap-card); color: var(--cap-text); min-width: 220px;
      }
      select:focus { outline: none; border-color: var(--cap-blue); }
      .two-cols { display: grid; grid-template-columns: 1fr auto 1fr; gap: 24px; align-items: start; }
      @media (max-width: 800px) { .two-cols { grid-template-columns: 1fr; } }
      .col h3 { margin: 0 0 4px; font-size: 1rem; color: var(--cap-text); }
      .meta { color: var(--cap-text-muted); margin: 0 0 12px; font-size: 0.9rem; }
      .kpis { display: grid; gap: 10px; }
      .kpi { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-radius: var(--cap-radius); border: 1px solid var(--cap-border); background: var(--cap-bg); }
      .k { font-size: 0.75rem; color: var(--cap-text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
      .v { font-weight: 700; color: var(--cap-text); }
      .diff .v.neg { color: var(--cap-success); }
      .diff .v.pos { color: var(--cap-error); }
      .muted { color: var(--cap-text-muted); font-size: 0.9rem; }
      .error { color: var(--cap-error); margin-top: 10px; font-size: 0.9rem; }
    `,
  ],
})
export class ComparePage {
  sites = signal<SiteResponse[]>([]);
  siteAId = signal<number>(0);
  siteBId = signal<number>(0);
  comparison = signal<SiteComparisonResponse | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  canCompare = computed(() => {
    const a = this.siteAId();
    const b = this.siteBId();
    return a > 0 && b > 0 && a !== b;
  });

  constructor(
    private api: SiteApiService,
    private auth: AuthService,
    private router: Router,
  ) {
    this.api.listSites().subscribe({
      next: (list) => this.sites.set(list),
      error: () => this.error.set('Impossible de charger les sites.'),
    });
  }

  runCompare() {
    if (!this.canCompare()) return;
    this.loading.set(true);
    this.error.set(null);
    this.comparison.set(null);
    this.api.compare(this.siteAId(), this.siteBId()).subscribe({
      next: (res) => {
        this.comparison.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erreur lors de la comparaison.');
        this.loading.set(false);
      },
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
