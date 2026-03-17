import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SiteApiService, SiteResponse } from '../../sites/site-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-sites-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <span class="logo">Capgemini</span>
          <span class="app-name">Empreinte Carbone — Sites</span>
        </div>
        <div class="actions">
          <a routerLink="/compare" class="btn-ghost">Comparer des sites</a>
          <button type="button" class="btn-ghost" (click)="refresh()">Rafraîchir</button>
          <button type="button" class="btn-ghost" (click)="logout()">Déconnexion</button>
        </div>
      </header>

      <main class="grid">
        <section class="card">
          <h2>Nouveau site</h2>
          <p class="card-desc">Saisissez les caractéristiques du site pour calculer son empreinte CO₂.</p>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="fields">
              <label>Nom <input formControlName="nom" placeholder="Ex. Campus Paris" /></label>
              <label>Localisation <input formControlName="localisation" placeholder="Ex. Paris" /></label>
              <label>Surface (m²) <input type="number" formControlName="surfaceM2" /></label>
              <label>Parking (places) <input type="number" formControlName="placesParking" /></label>
              <label>Conso (MWh/an) <input type="number" formControlName="consoEnergetiqueMWh" /></label>
              <label>Employés <input type="number" formControlName="nbEmployes" /></label>
              <label>Année <input type="number" formControlName="annee" /></label>
            </div>

            <h3>Matériaux</h3>
            <div formArrayName="materials" class="materials">
              <div class="material" *ngFor="let m of materials.controls; let i = index" [formGroupName]="i">
                <select formControlName="typeMateriau">
                  <option value="beton">Béton</option>
                  <option value="acier">Acier</option>
                  <option value="verre">Verre</option>
                  <option value="bois">Bois</option>
                </select>
                <input type="number" formControlName="quantite" placeholder="Qté" />
                <select formControlName="unite">
                  <option value="tonne">tonne</option>
                  <option value="m3">m³</option>
                </select>
                <button type="button" class="btn-ghost btn-sm" (click)="removeMaterial(i)" *ngIf="materials.length > 1">
                  Supprimer
                </button>
              </div>
            </div>

            <div class="row">
              <button type="button" class="btn-ghost" (click)="addMaterial()">+ Ajouter un matériau</button>
              <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
                {{ saving() ? 'Calcul…' : 'Calculer & enregistrer' }}
              </button>
            </div>
            <p class="error" *ngIf="saveError()">{{ saveError() }}</p>
          </form>
        </section>

        <section class="card">
          <h2>Sites enregistrés</h2>
          <p class="muted" *ngIf="loading()">Chargement...</p>
          <p class="error" *ngIf="loadError()">{{ loadError() }}</p>

          <div class="list" *ngIf="!loading() && !loadError()">
            <p class="muted empty" *ngIf="sites().length === 0">Aucun site enregistré. Remplissez le formulaire à gauche et cliquez sur « Calculer & enregistrer ».</p>
            <div class="site" *ngFor="let s of sites()">
              <div class="site-info">
                <div class="title">{{ s.nom }} <span class="muted">({{ s.annee }})</span></div>
                <div class="meta">{{ s.localisation }} — {{ s.surfaceM2 | number: '1.0-0' }} m²</div>
              </div>
              <div class="kpis">
                <div class="kpi">
                  <div class="k">CO₂ total</div>
                  <div class="v">{{ s.co2TotalKg | number: '1.0-0' }} kg</div>
                </div>
                <div class="kpi">
                  <div class="k">CO₂ / m²</div>
                  <div class="v">{{ s.co2ParM2 | number: '1.2-2' }}</div>
                </div>
                <div class="kpi">
                  <div class="k">CO₂ / employé</div>
                  <div class="v">{{ s.co2ParEmploye | number: '1.2-2' }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card nested" *ngIf="lastCreated()">
            <h3>Dernier calcul</h3>
            <div class="kpis">
              <div class="kpi big">
                <div class="k">CO₂ total</div>
                <div class="v primary">{{ lastCreated()!.co2TotalKg | number: '1.0-0' }} kg CO₂e</div>
              </div>
              <div class="kpi">
                <div class="k">Construction</div>
                <div class="v">{{ lastCreated()!.co2ConstructionKg | number: '1.0-0' }} kg</div>
              </div>
              <div class="kpi">
                <div class="k">Exploitation</div>
                <div class="v">{{ lastCreated()!.co2ExploitationKg | number: '1.0-0' }} kg</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      .shell { min-height: 100dvh; background: var(--cap-bg); color: var(--cap-text); }
      .topbar {
        display: flex; justify-content: space-between; align-items: center;
        padding: 14px 24px; background: var(--cap-blue); color: white;
        position: sticky; top: 0; z-index: 10; box-shadow: var(--cap-shadow);
      }
      .brand { display: flex; align-items: baseline; gap: 12px; }
      .logo { font-weight: 800; font-size: 1.2rem; letter-spacing: 0.02em; }
      .app-name { font-size: 0.95rem; opacity: 0.95; }
      .actions { display: flex; gap: 10px; align-items: center; }
      .actions a { text-decoration: none; color: inherit; }
      .btn-ghost {
        background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.35);
        color: white; padding: 8px 14px; border-radius: var(--cap-radius);
        cursor: pointer; font-size: 0.9rem; font-weight: 600;
      }
      .btn-ghost:hover { background: rgba(255,255,255,0.25); }
      .card .btn-ghost {
        background: var(--cap-card); border: 1px solid var(--cap-blue); color: var(--cap-blue);
      }
      .card .btn-ghost:hover { background: rgba(0, 112, 173, 0.08); }
      .btn-sm { padding: 6px 10px; font-size: 0.85rem; }
      .btn-primary {
        padding: 10px 16px; border-radius: var(--cap-radius); border: 0;
        background: var(--cap-blue); color: white; font-weight: 700; cursor: pointer;
      }
      .btn-primary:hover:not(:disabled) { background: var(--cap-blue-hover); }
      .btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px; }
      @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } }
      .card {
        background: var(--cap-card); border: 1px solid var(--cap-border);
        border-radius: var(--cap-radius-lg); padding: 20px; box-shadow: var(--cap-shadow);
      }
      .card-desc { margin: 0 0 16px; font-size: 0.9rem; color: var(--cap-text-muted); }
      .nested { margin-top: 16px; background: var(--cap-bg); }
      .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
      @media (max-width: 700px) { .fields { grid-template-columns: 1fr; } }
      label { display: grid; gap: 6px; font-size: 0.875rem; font-weight: 500; color: var(--cap-text); }
      input, select {
        padding: 10px 12px; border-radius: var(--cap-radius); border: 1px solid var(--cap-border);
        background: var(--cap-card); color: var(--cap-text);
      }
      input:focus, select:focus {
        outline: none; border-color: var(--cap-blue); box-shadow: 0 0 0 2px rgba(0,112,173,0.2);
      }
      h2 { margin: 0 0 4px; font-size: 1.2rem; color: var(--cap-text); }
      h3 { margin: 16px 0 10px; font-size: 1rem; color: var(--cap-text); }
      .materials { display: grid; gap: 10px; }
      .material { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; align-items: center; }
      .row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-top: 16px; }
      .list { display: grid; gap: 12px; }
      .site {
        display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: center;
        padding: 14px; border-radius: var(--cap-radius); border: 1px solid var(--cap-border);
        background: var(--cap-card);
      }
      .site-info { min-width: 0; }
      .title { font-weight: 700; color: var(--cap-text); }
      .meta { font-size: 0.85rem; color: var(--cap-text-muted); margin-top: 2px; }
      .kpis { display: grid; grid-auto-flow: column; grid-auto-columns: max-content; gap: 10px; align-items: center; }
      .kpi {
        padding: 10px 14px; border-radius: var(--cap-radius); border: 1px solid var(--cap-border);
        background: var(--cap-bg); min-width: 100px;
      }
      .kpi.big { min-width: 180px; }
      .k { font-size: 0.75rem; color: var(--cap-text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
      .v { font-weight: 700; margin-top: 2px; color: var(--cap-text); }
      .v.primary { color: var(--cap-blue); font-size: 1.1rem; }
      .muted { color: var(--cap-text-muted); font-size: 0.9rem; }
      .empty { padding: 20px; text-align: center; }
      .error { color: var(--cap-error); margin-top: 10px; font-size: 0.9rem; }
    `,
  ],
})
export class SitesPage {
  loading = signal(false);
  saving = signal(false);
  loadError = signal<string | null>(null);
  saveError = signal<string | null>(null);

  sites = signal<SiteResponse[]>([]);
  lastCreated = signal<SiteResponse | null>(null);
  hasSites = computed(() => this.sites().length > 0);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: SiteApiService,
    private auth: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      nom: ['', Validators.required],
      localisation: ['', Validators.required],
      surfaceM2: [0, [Validators.required, Validators.min(1)]],
      placesParking: [0, [Validators.required, Validators.min(0)]],
      consoEnergetiqueMWh: [0, [Validators.required, Validators.min(0)]],
      nbEmployes: [0, [Validators.required, Validators.min(0)]],
      annee: [2025, [Validators.required, Validators.min(1900)]],
      materials: this.fb.array([]),
    });
    this.addMaterial();
    this.refresh();
  }

  get materials(): FormArray {
    return this.form.get('materials') as FormArray;
  }

  addMaterial() {
    this.materials.push(
      this.fb.group({
        typeMateriau: ['beton', Validators.required],
        quantite: [0, [Validators.required, Validators.min(0)]],
        unite: ['tonne', Validators.required],
      }),
    );
  }

  removeMaterial(i: number) {
    this.materials.removeAt(i);
  }

  refresh() {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.listSites().subscribe({
      next: (sites) => {
        this.sites.set(sites);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.loadError.set(
          err?.status === 401
            ? 'Non autorisé (connecte-toi).'
            : 'Impossible de charger les sites (backend non démarré ?)',
        );
      },
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.api.createSite(this.form.value as any).subscribe({
      next: (site) => {
        this.lastCreated.set(site);
        this.saving.set(false);
        this.refresh();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(
          err?.status === 401
            ? 'Non autorisé (connecte-toi).'
            : "Erreur lors de l'enregistrement.",
        );
      },
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

