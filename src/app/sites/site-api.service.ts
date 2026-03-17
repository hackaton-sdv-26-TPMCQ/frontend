import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**
 * Client HTTP pour l'API sites du backend (baseUrl : localhost:8080/api).
 * Liste, création, détail, comparaison. Toutes les requêtes passent par l'interceptor JWT.
 */
export interface MaterialDto {
  typeMateriau: string;
  quantite: number;
  unite: string;
}

export interface SiteRequest {
  nom: string;
  localisation: string;
  surfaceM2: number;
  placesParking: number;
  consoEnergetiqueMWh: number;
  nbEmployes: number;
  annee: number;
  materials: MaterialDto[];
}

export interface SiteResponse {
  id: number;
  nom: string;
  localisation: string;
  surfaceM2: number;
  placesParking: number;
  consoEnergetiqueMWh: number;
  nbEmployes: number;
  annee: number;
  co2ConstructionKg: number;
  co2ExploitationKg: number;
  co2TotalKg: number;
  co2ParM2: number;
  co2ParEmploye: number;
  createdAt: string;
  materials: { id: number; typeMateriau: string; quantite: number; unite: string }[];
}

export interface SiteComparisonResponse {
  siteA: SiteResponse;
  siteB: SiteResponse;
  diffCo2TotalKg: number;
  diffCo2ParM2: number;
  diffCo2ParEmploye: number;
}

@Injectable({ providedIn: 'root' })
export class SiteApiService {
  private baseUrl = 'https://backend1-uj0j.onrender.com/api';

  constructor(private http: HttpClient) {}

  listSites() {
    return this.http.get<SiteResponse[]>(`${this.baseUrl}/sites`);
  }

  getSite(id: number) {
    return this.http.get<SiteResponse>(`${this.baseUrl}/sites/${id}`);
  }

  createSite(body: SiteRequest) {
    return this.http.post<SiteResponse>(`${this.baseUrl}/sites`, body);
  }

  compare(siteAId: number, siteBId: number) {
    return this.http.get<SiteComparisonResponse>(
      `${this.baseUrl}/sites/compare?siteA=${siteAId}&siteB=${siteBId}`,
    );
  }
}

