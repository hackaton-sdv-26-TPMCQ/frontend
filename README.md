# Frontend Angular — Empreinte Carbone

Interface web du projet **Hackathon 2026 - Empreinte carbone d’un site physique**.  
Ce dossier contient **uniquement le frontend** ; le backend (API REST) est à la racine du dépôt.

## Stack

- **Angular** (standalone components, signals, reactive forms)
- **Client HTTP** vers le backend (`http://localhost:8080/api`)
- **Authentification** : JWT (stockage localStorage, interceptor, guard)

## Structure (simplifiée)

```
web/
├── src/
│   ├── app/
│   │   ├── core/auth/          # AuthService, authGuard, authInterceptor
│   │   ├── sites/              # site-api.service (appels REST + DTOs)
│   │   ├── pages/
│   │   │   ├── login/          # Page de connexion
│   │   │   ├── sites/          # Dashboard (liste + formulaire nouveau site)
│   │   │   └── compare/        # Comparaison de deux sites
│   │   ├── app.config.ts       # Router, HttpClient, interceptors
│   │   ├── app.routes.ts       # Routes (login, sites, compare) + guard
│   │   ├── app.html            # Shell (router-outlet)
│   │   └── app.scss
│   ├── styles.scss             # Variables globales (thème Capgemini)
│   └── index.html
├── angular.json
└── package.json
```

## Lancer en dev

```bash
npm install
npm start
```

Ouvrir **http://localhost:4200**. Le backend doit tourner sur **http://localhost:8080** (voir README à la racine).

## Build production

```bash
npm run build
```

Sortie dans `dist/web/browser/`. Servir ce dossier derrière un reverse proxy ou un serveur web pointant sur la même origine que l’API si besoin.

## Thème

Couleurs Capgemini dans `src/styles.scss` : `--cap-blue`, `--cap-vibrant`, `--cap-bg`, etc. Les composants utilisent ces variables pour rester cohérents avec la charte.

## Séparation Backend / Frontend

- Aucune logique de calcul CO₂ : tout passe par l’API.
- `site-api.service.ts` centralise les appels (`listSites`, `createSite`, `getSite`, `compare`).
- L’URL de base de l’API est définie dans ce service ; pour un autre environnement, modifier `baseUrl`.
