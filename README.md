<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img src="https://img.shields.io/badge/platform-Web-green" />
  <img src="https://img.shields.io/badge/React-18-blue" />
  <img src="https://img.shields.io/badge/Vite-5-646cff" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ecf8e" />
</p>

<p align="center" style="margin-top:16px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">
  <img src="https://img.shields.io/badge/Status-Private-111827?style=for-the-badge" alt="Private repo" />
  <img src="https://img.shields.io/badge/Deploy-Manual-6b7280?style=for-the-badge" alt="Manual deploy" />
  <img src="https://img.shields.io/badge/Stack-Vite%20%7C%20React%20%7C%20Supabase-0ea5e9?style=for-the-badge" alt="Stack" />
</p>

# Pagellini Picche  
### Gestione pagellini, presenze e attività squadra

Applicazione web per squadre di pallavolo con due ruoli principali: **Moderatore** e **Giocatore**.  
Consente la creazione di pagellini allenamento/partita, gestione giocatori, eventi, presenze e votazione MVP.

---

## Panoramica
- **Moderatori**: creano pagellini, gestiscono giocatori, partite ed eventi, inviano notifiche
- **Giocatori**: consultano pagellini, votano MVP, rispondono alle presenze
- **Backend**: Supabase (Auth, DB, RLS, Edge Functions)

---

## Funzionalità

### Moderatore
- Creazione pagellino (allenamento/partita)
- Modifica e cancellazione pagellini
- Storico pagellini
- Medie giocatori
- Classifica MVP
- Gestione giocatori (crea/ruoli/elimina)
- Gestione partite (CRUD, annullamento, note)
- Gestione eventi con sondaggio presenze
- Impostazioni OneSignal

### Giocatore
- Ultimo pagellino
- Storico pagellini
- Dettaglio pagellino
- Dashboard personale (presenze, media, MVP)
- Voto MVP
- Eventi e presenze
- Lista partite

### Notifiche
- Notifiche in‑app
- Push via OneSignal (Edge Function server‑side)

---

## Stack Tecnologico
- **Frontend**: Vite, React 18, TypeScript
- **UI**: shadcn/ui, Tailwind CSS
- **Backend**: Supabase (Postgres, Auth, RLS, Edge Functions)
- **State/Data**: React Query

---

## Setup Locale

### Requisiti
- Node.js LTS
- npm (o pnpm/bun)

### Installazione
```bash
npm install
```

### Avvio
```bash
npm run dev
```

---

## Configurazione Env
File `.env` richiesto:
```
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
VITE_SUPABASE_PROJECT_ID="<project-ref>"
```

---

## Supabase
Questo progetto usa **Supabase remoto**.  
Per applicare le migrazioni serve un **Access Token** (account Supabase) o accesso al progetto.

Comandi utili:
```bash
supabase link --project-ref <project-ref>
supabase db push
```

---

## Scripts
```bash
npm run dev
npm run build
npm run lint
npm run preview
```

---

## Note Operative
- L’MVP è gestito dai giocatori con voto singolo per pagellino partita
- Le notifiche push non usano chiavi sensibili nel client
- Le query principali sono cache‑ate con React Query

---

## Sicurezza
Le policy RLS sono attive su tutte le tabelle principali.  
Le operazioni privilegiate (creazione/eliminazione utenti, push) passano da Edge Functions.

---

## License
MIT. Vedi `LICENSE`.

---

## Credits
Creato e mantenuto dal team Pagellini Picche.
