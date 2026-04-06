# Notra 24 — Notdienst-Leitstelle

24/7 Notdienst-Leitstelle für ältere Menschen in Antalya, Türkei.

```
Eview EV-Hub / EV-12 Gerät
        ↓ TCP (Port 5001)
[1] alarm-receiver (Python asyncio)
        ↓ HTTP POST Webhook
[2] n8n Workflow Engine
        ↓ REST API
[3] Next.js Backend (API Routes)
        ↓ WebSocket broadcast
[4] Operator Dashboard (Next.js)
        ↓ FreePBX REST API
[5] FreePBX → Netgsm SIP → Anruf
        ↓
[6] PostgreSQL (alle Daten)
```

## Schnellstart

### 1. Repository klonen & Konfigurieren

```bash
cp .env.example .env
# .env anpassen: DB_PASS, JWT_SECRET, etc.
```

### 2. System starten

```bash
docker compose up -d
```

### 3. Datenbank initialisieren

```bash
docker exec -it notra-app npx tsx src/db/migrate.ts
docker exec -it notra-app npx tsx src/db/seed.ts
```

### 4. Zugang

| Service      | URL                       | Credentials            |
|-------------|---------------------------|------------------------|
| Dashboard   | https://notra24.com       | admin@notra24.com / notra2024! |
| n8n         | https://n8n.notra24.com   | admin / (see .env)     |
| FreePBX     | http://server:8080        | admin / admin          |
| Alarm TCP   | server:5001 (TCP)         | —                      |

### 5. n8n Workflow importieren

1. Öffne https://n8n.notra24.com
2. Workflows → Import from File
3. Wähle `n8n-workflows/alarm-handler.json`
4. PostgreSQL Credentials konfigurieren
5. Workflow aktivieren

### 6. Gerät registrieren

1. Dashboard → Kunden → Neuer Kunde
2. Geräte-IDs des Eview EV-Hub/EV-12 eintragen
3. Notfallkontakte hinzufügen

## Projektstruktur

```
/opt/notra24/
├── src/
│   ├── app/             # Next.js Pages + API Routes
│   ├── db/              # Drizzle Schema + Migrations
│   ├── hooks/           # React Hooks (Auth, WebSocket)
│   └── lib/             # Auth, FreePBX, Audit, Response
├── services/
│   ├── alarm-receiver/  # Python TCP Server
│   └── freepbx/         # FreePBX Docker + Setup
├── n8n-workflows/       # Importierbare n8n Workflows
├── drizzle/             # SQL Migrations
├── docker-compose.yml   # Gesamt-Stack
├── Caddyfile            # Reverse Proxy
└── Dockerfile           # Next.js Container
```

## Troubleshooting

**Alarm-Receiver empfängt keine Events:**
```bash
docker logs notra-alarm-receiver
# TCP-Verbindung testen:
echo "[TEST001,999,,ABCD]" | nc -w2 server 5001
```

**Dashboard zeigt "OFFLINE":**
- WebSocket-Verbindung prüfen
- `docker logs notra-app` checken

**FreePBX Call schlägt fehl:**
- SIP-Trunk Status in FreePBX prüfen
- `docker logs notra-freepbx`
