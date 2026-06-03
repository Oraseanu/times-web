# Cloud deploy gratuit cu Cloudflare

Varianta cloud foloseste:

- Cloudflare Pages pentru frontend-ul Vite;
- Cloudflare Workers pentru API;
- Cloudflare D1 pentru baza de date SQL gratuita.

Frontend-ul si API-ul raman separate, dar folosesc acelasi contract:

```text
GET /state
PUT /state
```

## 1. Instaleaza si autentifica Wrangler

```powershell
npm.cmd install --save-dev wrangler
npx wrangler login
```

## 2. Creeaza baza D1

```powershell
npx wrangler d1 create times-web-db
```

Comanda afiseaza un `database_id`. Copiaza acel ID in:

```text
cloud/wrangler.jsonc
```

Inlocuieste:

```text
REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID
```

## 3. Ruleaza migrarea bazei

```powershell
npm.cmd run cloud-db:migrate
```

Migrarea creeaza tabela `app_state`.

## 4. Deploy API Worker

```powershell
npm.cmd run cloud-api:deploy
```

La final vei primi un URL de forma:

```text
https://times-web-api.<subdomeniul-tau>.workers.dev
```

## 5. Configureaza frontend-ul pentru cloud

Creeaza local un fisier `.env`:

```env
APP_MODE=cloud_prod
VITE_HOST=127.0.0.1
VITE_PORT=5173
CLOUD_API_BASE_URL=https://times-web-api.<subdomeniul-tau>.workers.dev
```

Pentru Cloudflare Pages, seteaza aceleasi environment variables in dashboard:

```text
APP_MODE=cloud_prod
CLOUD_API_BASE_URL=https://times-web-api.<subdomeniul-tau>.workers.dev
```

Build settings pentru Pages:

```text
Build command: npm run build
Build output directory: dist
```

## 6. Deploy frontend

Varianta recomandata este Git integration in Cloudflare Pages:

1. conectezi repo-ul GitHub;
2. alegi proiectul `times-web`;
3. setezi build command `npm run build`;
4. setezi output directory `dist`;
5. adaugi environment variables de mai sus.

Alternativ, poti face deploy direct:

```powershell
npm.cmd run build
npx wrangler pages deploy dist
```

## Note

- `.env` nu se urca in Git.
- `cloud/wrangler.jsonc` contine binding-ul D1 folosit de Worker.
- `cloud/migrations/0001_create_app_state.sql` creeaza tabela in D1.
- Pentru inceput, aplicatia salveaza tot state-ul intr-un singur rand JSON. Asta pastreaza codul simplu si permite mutarea ulterioara spre tabele separate pentru useri, proiecte si pontaje.
