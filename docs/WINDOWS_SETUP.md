# Windows setup guide — Uplift

This guide takes a clean Windows 10/11 machine to a running local copy of Uplift, then to a Supabase deployment, without relying on any Arena-hosted service.

Uplift needs exactly three things: **Node.js**, **PostgreSQL**, and a **`.env` file**. The AI assistant is optional; without a key it answers from your real workspace data using local guidance mode.

---

## 1. Install prerequisites

| Tool | Version | Download |
| --- | --- | --- |
| Node.js LTS | 20 or newer (22 recommended) | https://nodejs.org |
| PostgreSQL | 14 or newer (16 recommended) | https://www.postgresql.org/download/windows/ |
| Git (optional) | Any recent | https://git-scm.com/download/win |

During the PostgreSQL installer, keep port **5432**, set a password you will remember, and make sure **Command Line Tools** are selected.

Verify in **PowerShell** (open a new window after installing):

```powershell
node -v
npm -v
psql --version
```

If `psql` is not recognised, add `C:\Program Files\PostgreSQL\16\bin` to your `PATH` and reopen PowerShell.

---

## 2. Create the database

```powershell
# Log in as the default superuser
psql -U postgres

# Inside psql:
CREATE DATABASE uplift;
CREATE USER uplift_app WITH PASSWORD 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON DATABASE uplift TO uplift_app;
\c uplift
GRANT ALL ON SCHEMA public TO uplift_app;
\q
```

Notes:

- On PostgreSQL 15+, also run `ALTER DATABASE uplift OWNER TO uplift_app;` if you want the app user to own all future objects.
- The migration runner creates tables inside `public`.
- No extension is required.

---

## 3. Configure environment variables

From the project root:

```powershell
Copy-Item .env.example .env
notepad .env
```

Minimum working `.env`:

```dotenv
DATABASE_URL=postgresql://uplift_app:choose-a-strong-password@127.0.0.1:5432/uplift
DATABASE_SSL=false
SESSION_SECRET=paste-a-long-random-value-here
```

Generate a secure session secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Optional chatbot configuration (see section 7). Every supported variable is documented in `.env.example`. **Never commit `.env`**; it is already listed in `.gitignore`.

---

## 4. Install and set up the database

```powershell
npm install
npm run db:migrate
npm run db:seed
```

- `db:migrate` applies `drizzle/0000_initial.sql`. It is idempotent and **never drops or truncates data**.
- `db:seed` inserts the synthetic demo cohort **only if** the portal has no users. Existing records are preserved.
- `npm run db:setup` runs both.

The app also performs this setup automatically on first request (`DB_AUTO_SETUP` / `DB_AUTO_SEED`). Running the scripts explicitly is recommended so you can see any connection errors directly.

---

## 5. Run the application

```powershell
# Development (hot reload)
npm run dev

# Production build and server
npm run build
npm run start
```

Open http://localhost:3000. API health: http://localhost:3000/api/health.

Switch between the **Administrator**, **Teacher/advisor**, and **Student** demo workspaces from the profile menu at the bottom-left of the sidebar.

---

## 6. Supabase (or another hosted PostgreSQL)

1. Create a Supabase project.
2. In **Project Settings → Database → Connection string**, copy the **Session pooler** URI (recommended on Windows because it uses IPv4).
3. Replace the password placeholder with your database password.
4. Set:

```dotenv
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

5. Apply the schema and demo data from your machine:

```powershell
npm run db:migrate
npm run db:seed
```

6. Start the app locally and hit `/api/health`; it should report `"schemaReady": true` and non-zero student counts.

If your provider uses a certificate that Windows does not trust (common with self-signed dev databases only), set `DATABASE_SSL_REJECT_UNAUTHORIZED=false`. Do **not** disable verification on a public production database.

Supabase-specific notes:

- Uplift talks to PostgreSQL directly from the Next.js server with a server-side connection string. It does **not** use the Supabase browser client, so `anon` keys or RLS policies are not required.
- If you add a public API later, enable RLS and policies before exposing tables through Supabase's PostgREST layer.
- Do not paste database passwords into client-side code or `NEXT_PUBLIC_*` variables.
- On managed platforms, you can set `DB_AUTO_SETUP=false` and `DB_AUTO_SEED=false` and run the scripts as a release step.

---

## 7. AI chatbot configuration

The assistant is at **“Ask Uplift”** (bottom-right). It is server-side only: the API key never reaches the browser.

```dotenv
# OpenAI
AI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

Any OpenAI-compatible endpoint works:

| Provider | AI_BASE_URL | Example AI_MODEL |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| Ollama (local) | `http://127.0.0.1:11434/v1` | `llama3.1` |
| LM Studio | `http://127.0.0.1:1234/v1` | your loaded model |

For Ollama:

```powershell
ollama pull llama3.1
ollama serve
```

```dotenv
AI_API_KEY=ollama
AI_BASE_URL=http://127.0.0.1:11434/v1
AI_MODEL=llama3.1
```

**Without `AI_API_KEY`**, the assistant still responds using a deterministic, data-grounded guidance mode built from the records the signed-in role can access. The chat shows whether it is in provider or local mode. Provider errors (bad key, unreachable URL) automatically fall back to local guidance with a visible notice, so the chatbot never hangs silently.

The assistant never uses records outside the current role's scope, never receives a system role from the browser, and is instructed not to make admissions, disciplinary, or clinical decisions.

---

## 8. Portability scripts

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server (`PORT=8080 npm run start` to change port) |
| `npm run db:migrate` | Apply pending SQL migrations (safe to re-run) |
| `npm run db:seed` | Insert demo data only if empty |
| `npm run db:setup` | Migrate, then seed |
| `npm run db:generate` | Generate a new Drizzle migration after schema changes |
| `npm run db:export -- backup.json` | Export students, users, and interventions with IDs |
| `npm run db:import -- backup.json` | Restore records by ID, preserving relationships |
| `npm run verify` | Model math + assistant provider/fallback tests |
| `npm run test:e2e` | Full browser test (needs a running app) |

### Move existing Arena records to a new database

1. Point `.env` at the existing database and export:

   ```powershell
   npm run db:export -- uplift-data.json
   ```

2. Point `.env` at the new (empty) database:

   ```powershell
   npm run db:migrate
   npm run db:import -- uplift-data.json
   ```

The importer inserts explicit IDs, keeps foreign keys (`portal_users.student_id`, `interventions.student_id/author_id`), skips rows whose IDs already exist, and resets sequences so new inserts never collide. It does not delete or overwrite existing rows.

For a byte-for-byte backup instead, use PostgreSQL's own tools (available in `C:\Program Files\PostgreSQL\16\bin`):

```powershell
pg_dump --format=custom --no-owner --dbname="postgresql://uplift_app:PASSWORD@127.0.0.1:5432/uplift" --file uplift.dump
pg_restore --clean --if-exists --no-owner --dbname="postgresql://uplift_app:PASSWORD@NEW_HOST:5432/uplift" uplift.dump
```

`--clean` overwrites objects in the **target** database; it never touches the source.

---

## 9. Routes and refresh behavior

All navigation now uses real App Router URLs, so refresh, bookmarks, and new tabs work:

| URL | View |
| --- | --- |
| `/` | Overview |
| `/students` | Student directory |
| `/interventions` | Interventions / support plans |
| `/insights` | Insights & analytics |
| `/users` | Users & roles (admin) |
| `/settings` | Settings |
| `/records` | Academic record (student) |
| `/resources` | Resources (student) |

Unknown URLs render the styled `not-found` page instead of a blank 404.

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `DATABASE_URL is not set` | `.env` missing or in the wrong folder | Copy `.env.example` to `.env` in the project root. The app reads it via Next.js and `dotenv` in scripts. |
| `/api/workspace` returns 503 / 500 | PostgreSQL not running, wrong password, or tables missing | Check `/api/health` for the exact message, then `npm run db:migrate`. Do not assume the UI is broken. |
| `password authentication failed` | Wrong password/user in `DATABASE_URL` | Reset the role password in psql and update `.env` (URL-encode special characters such as `@` → `%40`). |
| `database "uplift" does not exist` | Database not created | Run `CREATE DATABASE uplift;` in psql. |
| Refresh on `/students` gives 404 | Old build with hash-only navigation | Rebuild and restart: `npm run build` then `npm run start`. All routes are now real pages. |
| Fonts return 404 | Old version referenced DM Sans files in `src/fonts` that were not shipped | Typography now uses **Geist Sans** from the installed `geist` package via `next/font`; rebuild. No runtime font URL or `src/fonts` file is required. |
| Chatbot shows local mode | No `AI_API_KEY` configured, or provider failed | Set `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` and restart. Local mode is intentional and still answers with your data. |
| “Port 3000 is in use” | Another dev server is running | Stop it, or run `$env:PORT=3001; npm run start`. |
| `psql`/`pg_dump` not found | PostgreSQL `bin` not on PATH | Add `C:\Program Files\PostgreSQL\16\bin` to PATH. |
| Syntax warnings about `.env` quotes | Quotes around values | Use `KEY=value` without surrounding quotes. |
| Session resets after restart | `SESSION_SECRET` missing | Set a long random `SESSION_SECRET` in `.env`. |

Useful diagnostics:

```powershell
npm run db:migrate        # shows the target host/database and applied files
Invoke-RestMethod http://localhost:3000/api/health | ConvertTo-Json -Depth 5
```

---

## 11. Security checklist

- `.env` and exported JSON backups are gitignored.
- No API keys or database passwords exist in source code.
- `AI_API_KEY` is read only in server route handlers.
- Session cookies are `httpOnly`, `sameSite=lax`, and `secure` when the request is HTTPS (including behind a proxy via `X-Forwarded-Proto`).
- Role access is enforced in API handlers, not only in the UI.
- This is a **demo** portal: demo role switching is intentionally open, and records are synthetic. Add real authentication (and set `DB_AUTO_SEED=false`) before using it with real students.
