import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SiteApiService, SiteResponse } from '../../sites/site-api.service';

@Component({
  standalone: true,
  selector: 'app-site-form-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="layout">
      <header>
        <h1>Empreinte carbone d’un site</h1>
        <p>Saisis les caractéristiques d’un site physique et visualise instantanément ses émissions.</p>
      </header>

      <main>
        <section class="left">
          <form [formGroup]="form" (ngSubmit)="submit()" class="card">
            <h2>Caractéristiques du site</h2>
            <div class="grid">
              <label>
                Nom
                <input formControlName="nom" />
              </label>
              <label>
                Localisation
                <input formControlName="localisation" />
              </label>
              <label>
                Surface (m²)
                <input type="number" formControlName="surfaceM2" />
              </label>
              <label>
                Places de parking
                <input type="number" formControlName="placesParking" />
              </label>
              <label>
                Conso énergétique (MWh/an)
                <input type="number" formControlName="consoEnergetiqueMWh" />
              </label>
              <label>
                Employés
                <input type="number" formControlName="nbEmployes" />
              </label>
              <label>
                Année
                <input type="number" formControlName="annee" />
              </label>
            </div>

            <h3>Matériaux de construction</h3>
            <div formArrayName="materials" class="materials">
              <div
                class="material-row"
                *ngFor="let mat of materials.controls; let i = index"
                [formGroupName]="i"
              >
                <select formControlName="typeMateriau">
                  <option value="beton">Béton</option>
                  <option value="acier">Acier</option>
                  <option value="verre">Verre</option>
                  <option value="bois">Bois</option>
                </select>
                <input type="number" formControlName="quantite" placeholder="Quantité" />
                <select formControlName="unite">
                  <option value="tonne">tonne</option>
                  <option value="m3">m³</option>
                </select>
                <button type="button" (click)="removeMaterial(i)" *ngIf="materials.length > 1">
                  ✕
                </button>
              </div>
            </div>
            <button type="button" class="ghost" (click)="addMaterial()">+ Ajouter un matériau</button>

            <button type="submit" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Calcul en cours…' : 'Calculer l’empreinte' }}
            </button>
          </form>
        </section>

        <section class="right">
          <div class="card" *ngIf="site(); else empty">
            <h2>Résultats</h2>
            <p class="subtitle">
              Site <strong>{{ site()!.nom }}</strong> — {{ site()!.localisation }} ({{ site()!.annee }})
            </p>
            <div class="kpi-grid">
              <div class="kpi">
                <h3>CO₂ total</h3>
                <p class="value">
                  {{ site()!.co2TotalKg | number: '1.0-0' }}<span>kg CO₂e</span>
                </p>
              </div>
              <div class="kpi">
                <h3>CO₂ / m²</h3>
                <p class="value">
                  {{ site()!.co2ParM2 | number: '1.2-2' }}<span>kg CO₂e/m²</span>
                </p>
              </div>
              <div class="kpi">
                <h3>CO₂ / employé</h3>
                <p class="value">
                  {{ site()!.co2ParEmploye | number: '1.2-2' }}<span>kg CO₂e/employé</span>
                </p>
              </div>
              <div class="kpi">
                <h3>Construction vs Exploitation</h3>
                <p class="value small">
                  {{ site()!.co2ConstructionKg | number: '1.0-0' }} kg (construction)<br />
                  {{ site()!.co2ExploitationKg | number: '1.0-0' }} kg (exploitation)
                </p>
              </div>
            </div>
          </div>

          <ng-template #empty>
            <div class="card placeholder">
              <h2>En attente de calcul</h2>
              <p>Saisis un site à gauche pour voir les indicateurs (CO₂ total, par m², par employé)…</p>
            </div>
          </ng-template>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      .layout {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding: 24px;
        background: radial-gradient(circle at top, #1b2b5a 0, #020617 45%);
        color: #e5ecff;
      }
      header {
        max-width: 960px;
      }
      header h1 {
        font-size: clamp(1.8rem, 2.6vw, 2.3rem);
        margin: 0 0 4px;
      }
      header p {
        margin: 0;
        opacity: 0.85;
      }
      main {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
        gap: 20px;
        align-items: flex-start;
      }
      @media (max-width: 900px) {
        main {
          grid-template-columns: minmax(0, 1fr);
        }
      }
      .card {
        background: rgba(15, 23, 42, 0.92);
        border-radius: 16px;
        padding: 20px 20px 24px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.6);
      }
      form.card {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      h2 {
        margin: 0 0 4px;
        font-size: 1.1rem;
      }
      h3 {
        margin: 10px 0 4px;
        font-size: 0.95rem;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px 16px;
      }
      label {
        display: grid;
        gap: 4px;
        font-size: 0.86rem;
      }
      input,
      select {
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.6);
        background: rgba(15, 23, 42, 0.7);
        color: inherit;
        font-size: 0.9rem;
      }
      input:focus,
      select:focus {
        outline: 2px solid #4f7cff;
        outline-offset: 1px;
      }
      .materials {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 4px;
      }
      .material-row {
        display: grid;
        grid-template-columns: 1.2fr 1.1fr 1.1fr auto;
        gap: 8px;
        align-items: center;
      }
      @media (max-width: 720px) {
        .material-row {
          grid-template-columns: 1fr 1fr;
          grid-auto-rows: auto;
        }
      }
      button {
        border-radius: 999px;
        border: 0;
        background: #4f7cff;
        color: white;
        padding: 9px 14px;
        font-size: 0.9rem;
        font-weight: 600;
        align-self: flex-start;
        cursor: pointer;
        margin-top: 4px;
      }
      button[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
      }
      button.ghost {
        background: transparent;
        border: 1px dashed rgba(148, 163, 184, 0.7);
        color: #e5ecff;
      }
      .material-row > button {
        background: transparent;
        border-radius: 999px;
        color: rgba(248, 113, 113, 0.95);
        border: 0;
        padding: 4px 6px;
        font-size: 0.85rem;
      }
      .right .card.placeholder {
        min-height: 220px;
        display: grid;
        place-content: center;
        text-align: left;
        opacity: 0.85;
      }
      .subtitle {
        margin: 2px 0 14px;
        font-size: 0.9rem;
        opacity: 0.9;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      .kpi {
        padding: 12px 12px 10px;
        border-radius: 12px;
        background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 60%),
          rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.55);
      }
      .kpi h3 {
        margin: 0 0 6px;
        font-size: 0.86rem;
        opacity: 0.9;
      }
      .value {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
      }
      .value span {
        display: block;
        font-size: 0.78rem;
        font-weight: 400;
        opacity: 0.9;
      }
      .value.small {
        font-size: 0.9rem;
      }
    `,
  ],
})
export class SiteFormPage {
  loading = signal(false);
  site = signal<SiteResponse | null>(null);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: SiteApiService,
  ) {
    this.form = this.fb.group({
      nom: ['Campus Rennes', [Validators.required]],
      localisation: ['Rennes', [Validators.required]],
      surfaceM2: [11771, [Validators.required, Validators.min(1)]],
      placesParking: [0, [Validators.required, Validators.min(0)]],
      consoEnergetiqueMWh: [1840, [Validators.required, Validators.min(0)]],
      nbEmployes: [1800, [Validators.required, Validators.min(0)]],
      annee: [2025, [Validators.required, Validators.min(1900)]],
      materials: this.fb.array([]),
    });
    this.addMaterial();
  }

  get materials(): FormArray {
    return this.form.get('materials') as FormArray;
  }

  addMaterial() {
    this.materials.push(
      this.fb.group({
        typeMateriau: ['beton', Validators.required],
        quantite: [1000, [Validators.required, Validators.min(0)]],
        unite: ['tonne', Validators.required],
      }),
    );
  }

  removeMaterial(index: number) {
    this.materials.removeAt(index);
  }

  readonly payloadPreview = computed(() => this.form.value);

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.api.createSite(this.form.value as any).subscribe({
      next: (site) => {
        this.site.set(site);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        alert('Erreur lors du calcul (backend démarré sur http://localhost:8080 ?)');
      },
    });
  }
}

