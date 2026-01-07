# Architecture / Architektura

## System Overview / Přehled systému

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI Marketing Agent                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │   Dashboard  │    │  Chat API    │    │  Scheduler   │         │
│  │   (Frontend) │    │              │    │  (Cron)      │         │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘         │
│         │                   │                   │                  │
│         └───────────────────┼───────────────────┘                  │
│                             │                                      │
│                    ┌────────▼────────┐                             │
│                    │   Express.js    │                             │
│                    │   HTTP Server   │                             │
│                    └────────┬────────┘                             │
│                             │                                      │
│         ┌───────────────────┼───────────────────┐                  │
│         │                   │                   │                  │
│  ┌──────▼──────┐    ┌───────▼───────┐   ┌──────▼──────┐           │
│  │  AI Brain   │    │ Approval Queue│   │   Email     │           │
│  │  (Claude)   │    │               │   │   Service   │           │
│  └──────┬──────┘    └───────┬───────┘   └──────┬──────┘           │
│         │                   │                   │                  │
│         └───────────────────┼───────────────────┘                  │
│                             │                                      │
│                    ┌────────▼────────┐                             │
│                    │     SQLite      │                             │
│                    │    Database     │                             │
│                    └────────┬────────┘                             │
│                             │                                      │
│                    ┌────────▼────────┐                             │
│                    │  Facebook API   │                             │
│                    │   (External)    │                             │
│                    └─────────────────┘                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Diagram / Diagram komponent

```
                                    ┌─────────────────┐
                                    │     User        │
                                    │   (Browser)     │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           ┌────────▼────────┐    ┌──────────▼──────────┐   ┌────────▼────────┐
           │    Dashboard    │    │        Chat         │   │     Email       │
           │   index.html    │    │      chat.html      │   │    (Inbox)      │
           └────────┬────────┘    └──────────┬──────────┘   └────────┬────────┘
                    │                        │                        │
                    │    HTTP Requests       │                        │
                    └────────────┬───────────┘                        │
                                 │                                    │
                    ┌────────────▼───────────┐                        │
                    │      Express.js        │◄───────────────────────┘
                    │     HTTP Server        │      Webhook Clicks
                    │     (Port 6081)        │
                    └────────────┬───────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼───────┐      ┌─────────▼─────────┐    ┌────────▼────────┐
│   API Routes  │      │  Webhook Routes   │    │  Static Files   │
│   /api/*      │      │   /webhook/*      │    │   /dashboard/*  │
└───────┬───────┘      └─────────┬─────────┘    └─────────────────┘
        │                        │
        └────────────┬───────────┘
                     │
        ┌────────────▼───────────┐
        │      AI Brain          │
        │   (brain.ts)           │
        │                        │
        │  ┌──────────────────┐  │
        │  │ System Prompts   │  │
        │  │ (prompts/*.ts)   │  │
        │  └──────────────────┘  │
        └────────────┬───────────┘
                     │
        ┌────────────▼───────────┐
        │   Anthropic Claude     │
        │   (External API)       │
        └────────────────────────┘
```

---

## Data Flow / Tok dat

### 1. User Creates Post via Chat
### 1. Uživatel vytváří příspěvek přes chat

```
User Input          AI Processing         Action Queue         Approval
    │                    │                     │                  │
    │  "Create post"     │                     │                  │
    ├───────────────────►│                     │                  │
    │                    │  Generate content   │                  │
    │                    ├────────────────────►│                  │
    │                    │                     │  Queue action    │
    │                    │                     ├─────────────────►│
    │                    │                     │                  │
    │                    │                     │  Send email      │
    │                    │                     │◄─────────────────┤
    │  Response + ID     │                     │                  │
    │◄───────────────────┤                     │                  │
```

### 2. Action Approval Flow
### 2. Tok schvalování akce

```
Email/Dashboard      Webhook Handler       Executor          Facebook
      │                    │                  │                  │
      │  Click Approve     │                  │                  │
      ├───────────────────►│                  │                  │
      │                    │  Mark approved   │                  │
      │                    ├─────────────────►│                  │
      │                    │                  │  Execute action  │
      │                    │                  ├─────────────────►│
      │                    │                  │                  │
      │                    │                  │  Result          │
      │                    │                  │◄─────────────────┤
      │  Confirmation      │                  │                  │
      │◄───────────────────┤                  │                  │
```

---

## Directory Structure / Struktura adresářů

```
Facebook_marketing/
│
├── src/                          # TypeScript source code
│   │
│   ├── agent/                    # Agent type definitions
│   │   └── types.ts              # Interfaces and types
│   │
│   ├── ai/                       # AI/Claude integration
│   │   ├── client.ts             # Anthropic API client
│   │   ├── gemini-client.ts      # Google Gemini API (Nano Banana)
│   │   ├── brain.ts              # Main AI logic
│   │   └── prompts/              # System prompts
│   │       └── system.ts         # Prompt templates
│   │
│   ├── tools/                    # External tools
│   │   ├── image-tools.ts        # Image generation & upload
│   │   ├── post-tools.ts         # Facebook post operations
│   │   └── campaign-tools.ts     # Facebook campaign operations
│   │
│   ├── approval/                 # Approval workflow
│   │   ├── queue.ts              # Action queue management
│   │   └── executor.ts           # Action execution
│   │
│   ├── database/                 # Database layer
│   │   ├── index.ts              # SQLite initialization
│   │   └── repositories/         # Data access
│   │       ├── actions.ts        # Actions CRUD
│   │       ├── audit.ts          # Audit logging
│   │       ├── budget.ts         # Budget tracking
│   │       ├── chat.ts           # Chat history
│   │       └── config.ts         # Configuration
│   │
│   ├── email/                    # Email service
│   │   ├── sender.ts             # Email sending logic
│   │   └── templates/            # Email templates
│   │       └── approval.ts       # Approval email HTML
│   │
│   ├── scheduler/                # Task scheduler
│   │   ├── index.ts              # Cron scheduler
│   │   └── tasks/                # Scheduled tasks
│   │       └── index.ts          # Task definitions
│   │
│   ├── server/                   # HTTP server
│   │   ├── index.ts              # Express app setup
│   │   └── routes/               # Route handlers
│   │       ├── api.ts            # REST API routes
│   │       └── webhook.ts        # Webhook handlers
│   │
│   ├── utils/                    # Utilities
│   │   └── logger.ts             # Logging setup
│   │
│   └── main.ts                   # Application entry point
│
├── dashboard/                    # Frontend files
│   ├── css/
│   │   └── main.css              # Styles
│   ├── js/
│   │   ├── api.js                # API client
│   │   └── app.js                # Dashboard logic
│   ├── index.html                # Main dashboard
│   ├── chat.html                 # Chat interface
│   ├── settings.html             # Settings page
│   └── logs.html                 # Logs viewer
│
├── data/                         # Runtime data
│   └── agent.db                  # SQLite database
│
├── uploads/                      # User uploads and generated images
│   └── images/                   # Post images (Nano Banana + uploads)
│
├── docs/                         # Documentation
│   ├── README.en.md              # English docs
│   ├── README.cs.md              # Czech docs
│   ├── API.md                    # API reference
│   └── ARCHITECTURE.md           # This file
│
├── dist/                         # Compiled JavaScript
│
├── .env                          # Environment config
├── package.json                  # Dependencies
├── tsconfig.agent.json           # TypeScript config
└── README.md                     # Project readme
```

---

## Database Schema / Schéma databáze

### Tables / Tabulky

#### config
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### actions
```sql
CREATE TABLE actions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payload TEXT NOT NULL,           -- JSON
  reasoning TEXT,
  expected_impact TEXT,
  confidence TEXT DEFAULT 'medium',
  approval_token TEXT UNIQUE,
  approved_by TEXT,
  result TEXT,                     -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  executed_at DATETIME
);
```

#### audit_log
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  action_id TEXT,
  details TEXT,                    -- JSON
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### chat_messages
```sql
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,              -- 'user' or 'assistant'
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### budget_transactions
```sql
CREATE TABLE budget_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  description TEXT,
  campaign_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Technology Stack / Technologický stack

| Layer | Technology | Purpose |
|-------|------------|----------|
| Runtime | Node.js 18+ | JavaScript runtime |
| Language | TypeScript | Type-safe JavaScript |
| Web Server | Express.js | HTTP routing |
| Database | SQLite | Persistent storage |
| AI | Anthropic Claude | Content generation |
| Image Generation | Nano Banana (Gemini 2.5 Flash Image) | AI image creation |
| Scheduler | node-cron | Task scheduling |
| Email | Nodemailer | SMTP sending |
| Security | Helmet | HTTP headers |
| Rate Limiting | express-rate-limit | API protection |

---

## Security Considerations / Bezpečnostní aspekty

### Implemented / Implementováno

1. **Helmet** - Secure HTTP headers
2. **Rate Limiting** - 100 requests/15 min per IP
3. **Token-based Approval** - UUID tokens for webhooks
4. **Optional Basic Auth** - Dashboard protection
5. **Input Validation** - JSON schema validation
6. **SQL Injection Prevention** - Parameterized queries

### Recommendations / Doporučení

1. Use HTTPS in production / Používejte HTTPS v produkci
2. Set strong dashboard password / Nastavte silné heslo
3. Rotate Facebook tokens regularly / Pravidelně obměňujte tokeny
4. Monitor audit logs / Sledujte audit logy
5. Limit network access / Omezte síťový přístup

---

## Scaling Considerations / Škálování

### Current Design / Aktuální design

- Single-instance deployment
- SQLite database (local file)
- Suitable for: Small to medium workloads

### For Higher Scale / Pro vyšší zátěž

1. **Database**: Migrate to PostgreSQL/MySQL
2. **Cache**: Add Redis for session/cache
3. **Queue**: Use Redis/RabbitMQ for job queue
4. **Load Balancer**: Nginx/HAProxy frontend
5. **Monitoring**: Prometheus + Grafana

---

## Deployment Options / Možnosti nasazení

### 1. Direct Node.js

```bash
npm run build:agent
npm run start:agent
```

### 2. PM2 Process Manager

```bash
npm install -g pm2
pm2 start dist/main.js --name marketing-agent
pm2 save
pm2 startup
```

### 3. Docker (Future)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
COPY dashboard ./dashboard
EXPOSE 6081
CMD ["node", "dist/main.js"]
```

### 4. Systemd Service

```ini
[Unit]
Description=AI Marketing Agent
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/marketing-agent
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## Monitoring / Monitorování

### Health Check Endpoint

```bash
curl http://localhost:6081/health
```

### Log Files

```bash
# Application logs
tail -f /tmp/agent.log

# Filter by level
grep "error" /tmp/agent.log
grep "info" /tmp/agent.log
```

### Key Metrics to Monitor

1. HTTP response times
2. AI API latency
3. Email delivery rate
4. Action approval rate
5. Scheduler task success
6. Database size

---

## Error Handling / Zpracování chyb

### Error Types

1. **Validation Errors** - Invalid input (400)
2. **Auth Errors** - Unauthorized access (401)
3. **Not Found** - Missing resources (404)
4. **Rate Limit** - Too many requests (429)
5. **Internal** - Server errors (500)

### Logging Levels

| Level | Usage |
|-------|-------|
| error | Exceptions, failures |
| warn | Potential issues |
| info | Normal operations |
| http | Request logging |
| debug | Development details |

---

## Future Enhancements / Budoucí vylepšení

1. **Multi-page Support** - Manage multiple Facebook pages
2. **A/B Testing** - Test post variations
3. **Analytics Dashboard** - Performance charts from FB
4. **Webhook Notifications** - Slack/Discord integration
5. **Campaign Templates** - Reusable campaign configurations
6. **User Management** - Multiple user accounts
7. **Mobile App** - React Native dashboard
8. **ML Optimization** - Learn from past performance
