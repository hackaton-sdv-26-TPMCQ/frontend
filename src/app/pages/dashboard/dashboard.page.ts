import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Chart } from 'chart.js/auto';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SiteApiService, SiteResponse } from '../../sites/site-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type MaterialType = 'beton' | 'acier' | 'verre' | 'bois' | string;

@Component({
  standalone: true,
  selector: 'app-dashboard-page',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <span class="logo">Capgemini</span>
          <span class="app-name">Dashboard CO₂</span>
        </div>
        <div class="actions">
          <a routerLink="/sites" class="btn-ghost">Sites</a>
          <a routerLink="/compare" class="btn-ghost">Comparer</a>
          <button type="button" class="btn-ghost" [disabled]="exportingPdf()" (click)="exportPdf()">
            {{ exportingPdf() ? 'Export…' : 'Exporter PDF' }}
          </button>
          <button type="button" class="btn-ghost" (click)="refresh()">Rafraîchir</button>
          <button type="button" class="btn-ghost" (click)="logout()">Déconnexion</button>
        </div>
      </header>

      <main class="main" #pdfArea>
        <section class="card">
          <div class="row">
            <div class="title">
              <h2>Indicateurs & graphiques</h2>
              <p class="card-desc">
                Sélectionnez un site pour visualiser ses KPIs, la répartition construction / exploitation, les matériaux, et son évolution dans le temps.
              </p>
            </div>

            <label class="picker" *ngIf="sites().length > 0">
              <span class="label-text">Site</span>
              <select [value]="selectedSiteId()" (change)="selectedSiteId.set(+$any($event.target).value)">
                <option [value]="0">-- Choisir --</option>
                <option *ngFor="let s of sites()" [value]="s.id">
                  {{ s.nom }} — {{ s.localisation }} ({{ s.annee }})
                </option>
              </select>
            </label>
          </div>

          <p class="muted" *ngIf="loading()">Chargement…</p>
          <p class="error" *ngIf="error()">{{ error() }}</p>
          <p class="muted" *ngIf="!loading() && !error() && sites().length === 0">
            Aucun site enregistré. Ajoute d’abord des sites depuis la page Sites.
          </p>
        </section>

        <section class="grid" *ngIf="selectedSite() as s">
          <div class="card kpis">
            <h3>KPIs</h3>
            <div class="kpi-grid">
              <div class="kpi">
                <div class="k">CO₂ total</div>
                <div class="v">{{ s.co2TotalKg | number: '1.0-0' }} kg CO₂e</div>
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
            <div class="chart-wrap">
              <canvas #kpiChart></canvas>
            </div>
          </div>

          <div class="card">
            <h3>Répartition CO₂</h3>
            <p class="muted small">Construction vs exploitation (en kg CO₂e).</p>
            <div class="chart-wrap">
              <canvas #splitChart></canvas>
            </div>
          </div>

          <div class="card">
            <h3>Matériaux (quantités)</h3>
            <p class="muted small">Répartition des quantités saisies par type de matériau (unité non normalisée).</p>
            <div class="chart-wrap">
              <canvas #materialsChart></canvas>
            </div>
          </div>

          <div class="card">
            <h3>Évolution (historisation)</h3>
            <p class="muted small">Courbes CO₂ (total / construction / exploitation) pour le même site (même nom + localisation) au fil des années.</p>
            <div class="chart-wrap">
              <canvas #historyChart></canvas>
            </div>
          </div>

          <div class="card">
            <h3>Évolution — intensités</h3>
            <p class="muted small">CO₂ / m² et CO₂ / employé au fil des années.</p>
            <div class="chart-wrap">
              <canvas #intensityChart></canvas>
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

      .main { padding: 24px; max-width: 1200px; margin: 0 auto; }
      .card {
        background: var(--cap-card); border: 1px solid var(--cap-border);
        border-radius: var(--cap-radius-lg); padding: 20px; margin-bottom: 20px;
        box-shadow: var(--cap-shadow);
      }
      h2 { margin: 0 0 4px; font-size: 1.2rem; color: var(--cap-text); }
      h3 { margin: 0 0 10px; font-size: 1rem; color: var(--cap-text); }
      .card-desc { margin: 0; font-size: 0.9rem; color: var(--cap-text-muted); }
      .muted { color: var(--cap-text-muted); font-size: 0.9rem; }
      .muted.small { font-size: 0.85rem; margin: 0 0 10px; }
      .error { color: var(--cap-error); margin-top: 10px; font-size: 0.9rem; }

      .row { display: flex; gap: 16px; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; }
      .title { min-width: 280px; flex: 1; }
      .picker { display: grid; gap: 6px; }
      .label-text { font-size: 0.875rem; font-weight: 600; color: var(--cap-text); }
      select {
        padding: 10px 12px; border-radius: var(--cap-radius); border: 1px solid var(--cap-border);
        background: var(--cap-card); color: var(--cap-text); min-width: 340px;
      }
      select:focus { outline: none; border-color: var(--cap-blue); box-shadow: 0 0 0 2px rgba(0,112,173,0.2); }
      @media (max-width: 700px) { select { min-width: 240px; width: 100%; } }

      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } }

      .kpis .kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; }
      @media (max-width: 900px) { .kpis .kpi-grid { grid-template-columns: 1fr; } }
      .kpi { padding: 10px 14px; border-radius: var(--cap-radius); border: 1px solid var(--cap-border); background: var(--cap-bg); }
      .k { font-size: 0.75rem; color: var(--cap-text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
      .v { font-weight: 800; margin-top: 2px; color: var(--cap-text); }

      .chart-wrap {
        height: 260px;
        border-radius: var(--cap-radius);
        border: 1px solid var(--cap-border);
        background: linear-gradient(180deg, rgba(0,112,173,0.03), transparent);
        padding: 10px;
      }
      canvas { width: 100% !important; height: 100% !important; }
    `,
  ],
})
export class DashboardPage implements AfterViewInit {
  private api = inject(SiteApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  loading = signal(false);
  error = signal<string | null>(null);
  sites = signal<SiteResponse[]>([]);
  exportingPdf = signal(false);

  selectedSiteId = signal<number>(0);
  selectedSite = computed(() => this.sites().find((s) => s.id === this.selectedSiteId()) ?? null);

  @ViewChild('pdfArea', { static: false }) pdfAreaEl?: ElementRef<HTMLElement>;
  @ViewChild('splitChart', { static: false }) splitChartEl?: ElementRef<HTMLCanvasElement>;
  @ViewChild('kpiChart', { static: false }) kpiChartEl?: ElementRef<HTMLCanvasElement>;
  @ViewChild('historyChart', { static: false }) historyChartEl?: ElementRef<HTMLCanvasElement>;
  @ViewChild('intensityChart', { static: false }) intensityChartEl?: ElementRef<HTMLCanvasElement>;
  @ViewChild('materialsChart', { static: false }) materialsChartEl?: ElementRef<HTMLCanvasElement>;

  private splitChart?: Chart;
  private kpiChart?: Chart;
  private historyChart?: Chart;
  private intensityChart?: Chart;
  private materialsChart?: Chart;

  constructor() {
    this.refresh();
  }

  ngAfterViewInit(): void {
    effect(
      () => {
        const s = this.selectedSite();
        if (!s) return;
        this.renderCharts(s);
      },
      { injector: this.destroyRef as any },
    );
  }

  refresh() {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listSites()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          this.sites.set(sorted);
          if (this.selectedSiteId() === 0 && sorted.length > 0) {
            this.selectedSiteId.set(sorted[0].id);
          }
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(
            err?.status === 401
              ? 'Non autorisé (connecte-toi).'
              : 'Impossible de charger les sites (backend non disponible ?)',
          );
        },
      });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  async exportPdf() {
    const site = this.selectedSite();
    const el = this.pdfAreaEl?.nativeElement;
    if (!site || !el || this.exportingPdf()) return;

    try {
      this.exportingPdf.set(true);

      const canvas = await html2canvas(el, {
        backgroundColor: '#f0f4f8',
        scale: Math.max(2, Math.min(3, window.devicePixelRatio || 2)),
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
      });

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const headerH = 14;
      const contentW = pageW - margin * 2;
      const contentH = pageH - margin * 2 - headerH;

      const title = `Empreinte carbone — ${site.nom} (${site.localisation})`;
      const subtitle = `Export du ${new Date().toLocaleString('fr-FR')}`;

      const imgData = canvas.toDataURL('image/png');
      const imgW = contentW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let remaining = imgH;
      let y = margin + headerH;
      let page = 0;

      while (remaining > 0) {
        if (page > 0) pdf.addPage();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(title, margin, margin + 6);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text(subtitle, margin, margin + 11);

        const sY = Math.max(0, (page * contentH * canvas.width) / imgW);
        const sH = Math.min(canvas.height - sY, (contentH * canvas.width) / imgW);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sH;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) break;
        ctx.drawImage(canvas, 0, sY, canvas.width, sH, 0, 0, canvas.width, sH);

        const pageImg = pageCanvas.toDataURL('image/png');
        const pageImgH = (sH * imgW) / canvas.width;
        pdf.addImage(pageImg, 'PNG', margin, y, imgW, pageImgH, undefined, 'FAST');

        remaining -= contentH;
        page += 1;
      }

      const safeName = `${site.nom}-${site.localisation}-${site.annee}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      pdf.save(`dashboard-${safeName || 'site'}.pdf`);
    } finally {
      this.exportingPdf.set(false);
    }
  }

  private renderCharts(s: SiteResponse) {
    this.renderSplitChart(s);
    this.renderKpiChart(s);
    this.renderMaterialsChart(s);
    this.renderHistoryChart(s);
    this.renderIntensityChart(s);
  }

  private renderSplitChart(s: SiteResponse) {
    const canvas = this.splitChartEl?.nativeElement;
    if (!canvas) return;
    const data = [s.co2ConstructionKg ?? 0, s.co2ExploitationKg ?? 0];
    const labels = ['Construction', 'Exploitation'];
    this.splitChart?.destroy();
    this.splitChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: ['#0070AD', '#17ABDA'],
            borderColor: ['#0070AD', '#17ABDA'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${Number(ctx.raw).toLocaleString('fr-FR')} kg CO₂e`,
            },
          },
        },
      },
    });
  }

  private renderKpiChart(s: SiteResponse) {
    const canvas = this.kpiChartEl?.nativeElement;
    if (!canvas) return;
    this.kpiChart?.destroy();
    this.kpiChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['CO₂ total (kg)', 'CO₂ / m²', 'CO₂ / employé'],
        datasets: [
          {
            label: `${s.nom} — ${s.localisation} (${s.annee})`,
            data: [s.co2TotalKg ?? 0, s.co2ParM2 ?? 0, s.co2ParEmploye ?? 0],
            backgroundColor: ['rgba(0,112,173,0.75)', 'rgba(23,171,218,0.75)', 'rgba(125,211,240,0.85)'],
            borderColor: ['#0070AD', '#17ABDA', '#7dd3f0'],
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${Number(ctx.raw).toLocaleString('fr-FR')}`,
            },
          },
        },
        scales: {
          x: { ticks: { color: '#1a2d3a' }, grid: { display: false } },
          y: { ticks: { color: '#1a2d3a' } },
        },
      },
    });
  }

  private renderMaterialsChart(s: SiteResponse) {
    const canvas = this.materialsChartEl?.nativeElement;
    if (!canvas) return;

    const totalsByType = new Map<MaterialType, number>();
    for (const m of s.materials ?? []) {
      const key = (m.typeMateriau ?? 'autre') as MaterialType;
      totalsByType.set(key, (totalsByType.get(key) ?? 0) + (m.quantite ?? 0));
    }
    const labels = [...totalsByType.keys()].map((t) => this.prettyMaterial(t));
    const values = [...totalsByType.values()];

    this.materialsChart?.destroy();
    this.materialsChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data: values.length ? values : [1],
            backgroundColor: values.length ? ['#0070AD', '#17ABDA', '#7dd3f0', '#005a8c', '#9bdcf2'] : ['#d1dce5'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${Number(ctx.raw).toLocaleString('fr-FR')}`,
            },
          },
        },
      },
    });
  }

  private renderHistoryChart(s: SiteResponse) {
    const canvas = this.historyChartEl?.nativeElement;
    if (!canvas) return;

    const key = `${s.nom}__${s.localisation}`.toLowerCase();
    const series = this.sites()
      .filter((x) => `${x.nom}__${x.localisation}`.toLowerCase() === key)
      .slice()
      .sort((a, b) => a.annee - b.annee);

    const labels = series.map((x) => String(x.annee));
    const total = series.map((x) => x.co2TotalKg ?? 0);
    const construction = series.map((x) => x.co2ConstructionKg ?? 0);
    const exploitation = series.map((x) => x.co2ExploitationKg ?? 0);

    this.historyChart?.destroy();
    this.historyChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'CO₂ total (kg CO₂e)',
            data: total,
            borderColor: '#0070AD',
            backgroundColor: 'rgba(0,112,173,0.12)',
            pointBackgroundColor: '#0070AD',
            pointBorderColor: '#0070AD',
            pointRadius: 3,
            tension: 0.25,
            fill: true,
          },
          {
            label: 'Construction (kg CO₂e)',
            data: construction,
            borderColor: '#17ABDA',
            backgroundColor: 'rgba(23,171,218,0.08)',
            pointBackgroundColor: '#17ABDA',
            pointBorderColor: '#17ABDA',
            pointRadius: 3,
            tension: 0.25,
            fill: false,
          },
          {
            label: 'Exploitation (kg CO₂e)',
            data: exploitation,
            borderColor: '#005a8c',
            backgroundColor: 'rgba(0,90,140,0.08)',
            pointBackgroundColor: '#005a8c',
            pointBorderColor: '#005a8c',
            pointRadius: 3,
            tension: 0.25,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { grid: { display: false } },
          y: {
            ticks: {
              callback: (v) => Number(v).toLocaleString('fr-FR'),
            },
          },
        },
      },
    });
  }

  private renderIntensityChart(s: SiteResponse) {
    const canvas = this.intensityChartEl?.nativeElement;
    if (!canvas) return;

    const key = `${s.nom}__${s.localisation}`.toLowerCase();
    const series = this.sites()
      .filter((x) => `${x.nom}__${x.localisation}`.toLowerCase() === key)
      .slice()
      .sort((a, b) => a.annee - b.annee);

    const labels = series.map((x) => String(x.annee));
    const perM2 = series.map((x) => x.co2ParM2 ?? 0);
    const perEmp = series.map((x) => x.co2ParEmploye ?? 0);

    this.intensityChart?.destroy();
    this.intensityChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'CO₂ / m²',
            data: perM2,
            borderColor: '#17ABDA',
            backgroundColor: 'rgba(23,171,218,0.12)',
            pointRadius: 3,
            tension: 0.25,
            yAxisID: 'y',
          },
          {
            label: 'CO₂ / employé',
            data: perEmp,
            borderColor: '#0070AD',
            backgroundColor: 'rgba(0,112,173,0.12)',
            pointRadius: 3,
            tension: 0.25,
            yAxisID: 'y',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { grid: { display: false } },
          y: {
            ticks: {
              callback: (v) => Number(v).toLocaleString('fr-FR'),
            },
          },
        },
      },
    });
  }

  private prettyMaterial(t: string) {
    switch (t?.toLowerCase()) {
      case 'beton':
        return 'Béton';
      case 'acier':
        return 'Acier';
      case 'verre':
        return 'Verre';
      case 'bois':
        return 'Bois';
      default:
        return t || 'Autre';
    }
  }
}

