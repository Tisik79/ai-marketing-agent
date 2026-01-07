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

## Technology Stack / Technologický stack

| Layer | Technology | Purpose |
|-------|------------|----------|
| Runtime | Node.js 18+ | JavaScript runtime |
| Language | TypeScript | Type-safe JavaScript |
| Web Server | Express.js | HTTP routing |
| Database | SQLite | Persistent storage |
| AI | Anthropic Claude | Content generation |
| Scheduler | node-cron | Task scheduling |
| Email | Nodemailer | SMTP sending |
| Security | Helmet | HTTP headers |
| Rate Limiting | express-rate-limit | API protection |

---

## Directory Structure / Struktura adresářů

```
ai-marketing-agent/
│
├── src/                          # TypeScript source code
│   │
│   ├── agent/                    # Agent type definitions
│   │   └── types.ts              # Interfaces and types
│   │
│   ├── ai/                       # AI/Claude integration
│   │   ├── client.ts             # Anthropic API client
│   │   ├── brain.ts              # Main AI logic
│   │   └── prompts/              # System prompts
│   │       └── system.ts         # Prompt templates
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

## License

MIT License
