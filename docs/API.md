# API Documentation / API Dokumentace

## Base URL

```
http://your-server:6081
```

---

## Authentication / Autentizace

The API currently supports optional Basic Authentication. Configure in `.env`:

API aktuálně podporuje volitelnou Basic autentizaci. Nakonfigurujte v `.env`:

```env
DASHBOARD_USER=admin
DASHBOARD_PASS=your-password
```

When enabled, include header / Když je povolena, přidejte hlavičku:
```
Authorization: Basic base64(username:password)
```

---

## Endpoints

### Dashboard API

#### GET /api/dashboard

Returns complete dashboard data.

Vrací kompletní data dashboardu.

**Response / Odpověď:**
```json
{
  "agent": {
    "name": "Marketing Agent",
    "status": "active"
  },
  "budget": {
    "monthlyBudget": 10000,
    "monthlySpent": 2500,
    "monthlyRemaining": 7500,
    "monthlyPercentUsed": 25,
    "dailyLimit": 500,
    "todaySpent": 125
  },
  "goals": [
    {
      "type": "leads",
      "target": 100,
      "current": 45,
      "period": "monthly",
      "priority": "high",
      "progress": 45,
      "onTrack": true
    }
  ],
  "pendingActions": [...],
  "recentActions": [...],
  "stats": {
    "total": 50,
    "pending": 2,
    "approved": 30,
    "rejected": 10,
    "executed": 28,
    "failed": 2,
    "expired": 8
  }
}
```

---

#### GET /api/settings

Returns current agent configuration.

Vrací aktuální konfiguraci agenta.

**Response / Odpověď:**
```json
{
  "name": "Marketing Agent",
  "facebookPageId": "123456789",
  "facebookAccountId": "act_123456789",
  "budget": {
    "total": 10000,
    "dailyLimit": 500,
    "alertThreshold": 80,
    "period": "monthly"
  },
  "strategy": {
    "targetAudience": "Owners of older houses",
    "tone": "Professional and friendly",
    "topics": ["renovation", "maintenance"],
    "postFrequency": "daily",
    "preferredPostTimes": ["10:00", "18:00"]
  },
  "goals": [...],
  "approval": {
    "requireApprovalFor": ["create_post", "adjust_budget"],
    "autoApproveBelow": 0,
    "notifyEmail": "user@email.com",
    "timeoutHours": 24
  }
}
```

---

#### PUT /api/settings

Updates agent configuration.

Aktualizuje konfiguraci agenta.

**Request / Požadavek:**
```json
{
  "name": "My Marketing Agent",
  "budget": {
    "total": 15000,
    "dailyLimit": 750
  },
  "strategy": {
    "targetAudience": "Young homeowners",
    "tone": "Casual and helpful"
  }
}
```

**Response / Odpověď:**
```json
{
  "success": true,
  "message": "Settings updated"
}
```

---

#### GET /api/approvals

Returns list of pending actions.

Vrací seznam čekajících akcí.

**Response / Odpověď:**
```json
{
  "approvals": [
    {
      "id": "uuid-1234",
      "token": "approval-token-5678",
      "type": "create_post",
      "typeName": "Nový příspěvek",
      "status": "pending",
      "createdAt": "2026-01-06T10:00:00.000Z",
      "expiresAt": "2026-01-07T10:00:00.000Z",
      "reasoning": "Post about winter maintenance",
      "expectedImpact": "Increased engagement",
      "confidence": "medium",
      "payload": {
        "content": "Post content here...",
        "scheduledTime": "14:00",
        "imagePath": "/uploads/images/nanobanana_uuid.png",
        "imageSource": "dalle",
        "imagePrompt": "Winter house maintenance scene..."
      }
    }
  ]
}
```

---

#### GET /api/agent/status

Returns agent status and system info.

Vrací stav agenta a systémové informace.

**Response / Odpověď:**
```json
{
  "status": "active",
  "uptime": 3600,
  "version": "1.0.0",
  "schedulerRunning": true,
  "lastActivity": "2026-01-06T10:00:00.000Z"
}
```

---

### Chat API

#### POST /api/chat

Send message to AI agent.

Odeslání zprávy AI agentovi.

**Request / Požadavek:**
```json
{
  "message": "Create a post about home renovation tips"
}
```

**Response / Odpověď:**
```json
{
  "response": "Here's a post suggestion:\n\n```json\n{\"content\": \"...\", ...}\n```\n\n---\n✅ **Akce byla zařazena ke schválení**\nID: uuid-1234\nTyp: Nový příspěvek\nStav: Čeká na schválení"
}
```

---

#### GET /api/chat/history

Returns chat message history.

Vrací historii chatových zpráv.

**Query Parameters / Parametry:**
- `limit` (optional): Number of messages (default: 50)

**Response / Odpověď:**
```json
{
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "Hello",
      "timestamp": "2026-01-06T10:00:00.000Z"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Hello! How can I help?",
      "timestamp": "2026-01-06T10:00:05.000Z"
    }
  ]
}
```

---

### Webhook Endpoints

#### GET /webhook/approve/:token

Approves action and executes it immediately.

Schvaluje akci a okamžitě ji provede.

**Parameters / Parametry:**
- `token`: Approval token from action

**Response / Odpověď:**
HTML page with success/error message.

HTML stránka s výsledkem.

---

#### GET /webhook/reject/:token

Rejects and cancels action.

Zamítne a zruší akci.

**Parameters / Parametry:**
- `token`: Approval token from action

**Response / Odpověď:**
HTML page with confirmation.

HTML stránka s potvrzením.

---

#### GET /webhook/view/:token

Shows action details page.

Zobrazí stránku s detaily akce.

**Parameters / Parametry:**
- `token`: Approval token from action

**Response / Odpověď:**
HTML page with action details, content preview, and approve/reject buttons.

HTML stránka s detaily akce, náhledem obsahu a tlačítky.

---

#### GET /webhook/edit/:token

Shows edit form for post content.

Zobrazí formulář pro úpravu obsahu příspěvku.

**Parameters / Parametry:**
- `token`: Approval token from action

**Response / Odpověď:**
HTML form with textarea for editing post content.

HTML formulář s textarea pro úpravu.

---

#### POST /webhook/edit/:token

Submits edited content and approves action.

Odešle upravený obsah a schválí akci.

**Parameters / Parametry:**
- `token`: Approval token from action

**Body:**
```
content=Edited post content here
```

**Response / Odpověď:**
HTML page with success/error message.

---

### Image API

#### POST /api/images/upload

Upload image for post.

Nahrání obrázku pro příspěvek.

**Request / Požadavek:**
```
Content-Type: multipart/form-data
image: [binary file]
```

**Response / Odpověď:**
```json
{
  "success": true,
  "filename": "upload_uuid.png",
  "path": "/uploads/images/upload_uuid.png"
}
```

---

#### GET /api/images/:filename

Serves uploaded or generated image.

Servíruje nahraný nebo vygenerovaný obrázek.

**Parameters / Parametry:**
- `filename`: Image filename

**Response / Odpověď:**
Binary image file with appropriate Content-Type header.

---

#### POST /api/regenerate-image/:actionId

Regenerates Nano Banana image for pending action.

Regeneruje Nano Banana obrázek pro čekající akci.

**Parameters / Parametry:**
- `actionId`: ID of pending action

**Request / Požadavek (optional):**
```json
{
  "prompt": "New image prompt (optional)"
}
```

**Response / Odpověď:**
```json
{
  "success": true,
  "imagePath": "/uploads/images/nanobanana_uuid.png"
}
```

---

#### GET /webhook/regenerate/:token

Regenerates image via email link.

Regeneruje obrázek přes odkaz z emailu.

**Parameters / Parametry:**
- `token`: Approval token from action

**Response / Odpověď:**
HTML page with new image preview.

---

### Health Check

#### GET /health

Returns server health status.

Vrací stav zdraví serveru.

**Response / Odpověď:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-06T10:00:00.000Z",
  "uptime": 3600
}
```

---

## Error Responses / Chybové odpovědi

All API endpoints return errors in this format:

Všechny API endpointy vracejí chyby v tomto formátu:

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Description EN | Popis CZ |
|------|---------------|----------|
| 200 | Success | Úspěch |
| 400 | Bad Request | Špatný požadavek |
| 401 | Unauthorized | Neautorizováno |
| 404 | Not Found | Nenalezeno |
| 429 | Too Many Requests | Příliš mnoho požadavků |
| 500 | Internal Server Error | Interní chyba serveru |

---

## Rate Limiting

API endpoints under `/api/` are rate-limited to 100 requests per 15 minutes per IP.

API endpointy pod `/api/` jsou omezeny na 100 požadavků za 15 minut na IP.

When limit is exceeded / Při překročení limitu:
```json
{
  "error": "Too many requests, please try again later."
}
```

---

## Action Types / Typy akcí

| Type | Description EN | Popis CZ |
|------|---------------|----------|
| `create_post` | Create Facebook post | Vytvoření příspěvku |
| `boost_post` | Boost post with ads | Propagace příspěvku |
| `create_campaign` | Create ad campaign | Vytvoření kampaně |
| `adjust_budget` | Modify campaign budget | Úprava rozpočtu |
| `pause_campaign` | Pause campaign | Pozastavení kampaně |
| `resume_campaign` | Resume campaign | Obnovení kampaně |
| `create_ad` | Create advertisement | Vytvoření reklamy |
| `modify_targeting` | Change targeting | Změna cílení |

---

## Image Sources / Zdroje obrázků

| Source | Description EN | Popis CZ |
|--------|---------------|----------|
| `dalle` | AI generated (Nano Banana) | AI vygenerovaný (Nano Banana) |
| `upload` | User uploaded | Nahraný uživatelem |
| `none` | No image | Bez obrázku |

> Note: The `dalle` value is used for backward compatibility. The actual image generation is performed by Nano Banana (Gemini 2.5 Flash Image).
>
> Poznámka: Hodnota `dalle` se používá pro zpětnou kompatibilitu. Obrázky jsou generovány pomocí Nano Banana (Gemini 2.5 Flash Image).

---

## Action Statuses / Stavy akcí

| Status | Description EN | Popis CZ |
|--------|---------------|----------|
| `pending` | Awaiting approval | Čeká na schválení |
| `approved` | Approved, awaiting execution | Schváleno, čeká na provedení |
| `rejected` | Rejected by user | Zamítnuto uživatelem |
| `executed` | Successfully executed | Úspěšně provedeno |
| `failed` | Execution failed | Provedení selhalo |
| `expired` | Timed out | Vypršelo |

---

## Confidence Levels / Úrovně spolehlivosti

| Level | Description EN | Popis CZ |
|-------|---------------|----------|
| `high` | AI is very confident | AI je velmi jistá |
| `medium` | AI is moderately confident | AI je středně jistá |
| `low` | AI is uncertain | AI si není jistá |

---

## Examples / Příklady

### cURL Examples

**Get dashboard data:**
```bash
curl http://localhost:6081/api/dashboard
```

**Send chat message:**
```bash
curl -X POST http://localhost:6081/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a post about spring cleaning"}'
```

**Send chat message with image upload:**
```bash
curl -X POST http://localhost:6081/api/chat \
  -F "message=Create a post with this image" \
  -F "image=@/path/to/image.jpg"
```

**Approve action:**
```bash
curl http://localhost:6081/webhook/approve/your-token-here
```

**Update settings:**
```bash
curl -X PUT http://localhost:6081/api/settings \
  -H "Content-Type: application/json" \
  -d '{"budget": {"total": 20000}}'
```

### JavaScript Examples

```javascript
// Get dashboard data
const response = await fetch('/api/dashboard');
const data = await response.json();

// Send chat message
const chatResponse = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello AI' })
});
const result = await chatResponse.json();
```
