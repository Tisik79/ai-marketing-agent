# AI Marketing Agent pro Facebook

Autonomní marketingový agent poháněný umělou inteligencí pro správu Facebook reklamních kampaní, tvorbu obsahu a optimalizaci výkonu s workflow schvalování člověkem.

## Obsah

1. [Přehled](#přehled)
2. [Funkce](#funkce)
3. [Požadavky](#požadavky)
4. [Instalace](#instalace)
5. [Konfigurace](#konfigurace)
6. [Použití](#použití)
7. [Dashboard](#dashboard)
8. [Systém schvalování](#systém-schvalování)
9. [Plánovač](#plánovač)
10. [API Reference](#api-reference)
11. [Architektura](#architektura)
12. [Řešení problémů](#řešení-problémů)

---

## Přehled

AI Marketing Agent je Node.js aplikace využívající Claude AI (Anthropic) pro autonomní správu marketingových aktivit na Facebooku. Nabízí:

- **Autonomní tvorba obsahu**: AI generuje příspěvky na Facebook podle vaší strategie značky
- **Analýza kampaní**: Analyzuje výkon kampaní a navrhuje optimalizace
- **Správa rozpočtu**: Sleduje výdaje a optimalizuje alokaci rozpočtu
- **Schvalování člověkem**: Všechny akce vyžadují lidské schválení před provedením
- **E-mailové notifikace**: Odesílá žádosti o schválení a denní reporty e-mailem
- **Webový dashboard**: Rozhraní pro sledování a správu v reálném čase

---

## Funkce

### AI-generovaný obsah
- Vytváří poutavé příspěvky na Facebook přizpůsobené vaší cílové skupině
- Zohledňuje aktuální datum, roční období a relevantní události
- Navrhuje optimální časy publikace a hashtagy

### Analýza výkonu kampaní
- Analyzuje zobrazení, dosah, kliky, CTR, CPC a konverze
- Identifikuje problémy a příležitosti
- Generuje praktická doporučení

### Optimalizace rozpočtu
- Sleduje denní a měsíční výdaje
- Navrhuje přerozdělení rozpočtu mezi kampaněmi
- Odesílá upozornění při blížícím se limitu rozpočtu

### Workflow schvalování
- Všechny AI-navržené akce jsou zařazeny ke schválení
- Schvalte, zamítněte nebo upravte akce přes dashboard nebo e-mailové odkazy
- Konfigurovatelný timeout pro čekající akce

### Naplánované úlohy
- Ranní analýza (6:00)
- Návrhy obsahu (8:00)
- Kontroly výkonu (12:00, 18:00)
- Optimalizace rozpočtu (20:00)
- Denní reporty (21:00)
- Týdenní reporty (neděle 18:00)

### E-mailové notifikace
- E-maily se žádostí o schválení s odkazy pro jedno kliknutí
- Denní reporty o výkonu
- Upozornění na rozpočet
- Potvrzení o provedení

---

## Požadavky

- Node.js 18+
- npm nebo yarn
- Facebook Business účet s:
  - Facebook stránkou
  - Facebook Ads účtem
  - Page Access Tokenem
- Anthropic API klíč (Claude)
- SMTP server pro e-mailové notifikace (např. Gmail)

---

## Instalace

### 1. Klonování repozitáře

```bash
git clone <repository-url>
cd Facebook_marketing
```

### 2. Instalace závislostí

```bash
npm install
```

### 3. Konfigurace prostředí

Zkopírujte příklad konfiguračního souboru a upravte ho:

```bash
cp .env.example .env
nano .env
```

### 4. Sestavení aplikace

```bash
npm run build:agent
```

### 5. Spuštění agenta

```bash
npm run start:agent
```

Agent se spustí na `http://localhost:6081` ve výchozím nastavení.

---

## Konfigurace

### Proměnné prostředí

Vytvořte soubor `.env` s následujícími proměnnými:

```env
# Facebook API
FACEBOOK_APP_ID=vaše_app_id
FACEBOOK_APP_SECRET=vaše_app_secret
FACEBOOK_ACCESS_TOKEN=váš_access_token
FACEBOOK_ACCOUNT_ID=act_vaše_account_id
FACEBOOK_PAGE_ID=vaše_page_id
FACEBOOK_PAGE_ACCESS_TOKEN=váš_page_access_token
FACEBOOK_BUSINESS_ID=vaše_business_id

# Server
PORT=6081
HOST=0.0.0.0
BASE_URL=http://ip-vašeho-serveru:6081

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-...

# Konfigurace agenta
AGENT_NAME=Marketing Agent
MONTHLY_BUDGET=10000
DAILY_LIMIT=500
BUDGET_ALERT_THRESHOLD=80

# E-mail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=vas-email@gmail.com
SMTP_PASS=heslo-aplikace
EMAIL_FROM=AI Marketing Agent <vas-email@gmail.com>
EMAIL_TO=prijemce@email.cz

# Logování
LOG_LEVEL=info
```

### Nastavení Facebooku

1. **Vytvořte Facebook aplikaci** na [developers.facebook.com](https://developers.facebook.com)
2. **Získejte Page Access Token**:
   - Přejděte do Graph API Explorer
   - Vyberte svou aplikaci a stránku
   - Vyžádejte oprávnění `pages_manage_posts`, `pages_read_engagement`, `ads_management`
   - Vygenerujte dlouhodobý token

3. **Získejte Ads Account ID**:
   - Přejděte do Facebook Ads Manager
   - Vaše account ID je v URL: `act_XXXXXXXXX`

### Nastavení Gmail SMTP

1. Povolte dvoufaktorové ověření na vašem Google účtu
2. Vygenerujte heslo aplikace:
   - Přejděte na Google účet → Zabezpečení → Hesla aplikací
   - Vytvořte nové heslo aplikace pro "Pošta"
3. Použijte toto heslo jako `SMTP_PASS`

---

## Použití

### Spuštění agenta

```bash
# Vývojový režim (s automatickým načítáním)
npm run dev:agent

# Produkční režim
npm run start:agent

# Spuštění na pozadí
npm run start:agent > /tmp/agent.log 2>&1 &
```

### Přístup k dashboardu

Otevřete prohlížeč a přejděte na:
```
http://ip-vašeho-serveru:6081/dashboard
```

### Chatovací rozhraní

Chatovací rozhraní umožňuje přímou interakci s AI:
```
http://ip-vašeho-serveru:6081/dashboard/chat.html
```

Příklady příkazů:
- "Vytvoř příspěvek o zimní údržbě domu"
- "Jak vypadá náš rozpočet?"
- "Analyzuj výkon kampaní"
- "Jaké příspěvky bychom měli publikovat tento týden?"

---

## Dashboard

### Hlavní dashboard (`/dashboard`)

Hlavní dashboard zobrazuje:

- **Stav agenta**: Ukazuje, zda je agent aktivní
- **Přehled rozpočtu**: Měsíční rozpočet, utracená částka, zbývající
- **KPI karty**: Metriky dosahu, leadů, CTR
- **Graf výkonu**: 7denní graf výkonu
- **Plnění cílů**: Vizuální průběh plnění definovaných cílů
- **Čekající akce**: Akce čekající na schválení s náhledem
- **Poslední akce**: Historie provedených akcí

### Čekající akce

Každá čekající akce zobrazuje:
- Typ akce (Nový příspěvek, Úprava rozpočtu, atd.)
- Čas vypršení
- Tlačítko náhledu (ikona oka) - otevře modální okno s úplným náhledem
- Tlačítko schválení (fajfka) - provede akci
- Tlačítko zamítnutí (X) - zruší akci

### Modální okno náhledu

Kliknutím na tlačítko náhledu se otevře modální okno zobrazující:
- Úplný obsah příspěvku, jak se zobrazí na Facebooku
- Zdůvodnění AI pro návrh
- Očekávaný dopad
- Úroveň spolehlivosti (Vysoká/Střední/Nízká)
- Tlačítka Schválit/Zamítnout

### Chatovací rozhraní (`/dashboard/chat.html`)

Interaktivní chat s AI agentem:
- Ptejte se na kampaně
- Žádejte o tvorbu obsahu
- Získejte přehled o výkonu
- Akce navržené v chatu jsou automaticky zařazeny ke schválení

### Nastavení (`/dashboard/settings.html`)

Konfigurace:
- Název agenta
- Měsíční rozpočet a denní limit
- Prahy upozornění
- Cílová skupina
- Tón komunikace
- Témata a frekvence publikování
- Nastavení e-mailu

---

## Systém schvalování

### Workflow

1. **Vytvoření akce**: AI navrhne akci (příspěvek, změna rozpočtu, atd.)
2. **Fronta**: Akce je přidána do fronty schvalování s unikátním tokenem
3. **Notifikace**: E-mail je odeslán s odkazy pro schválení/zamítnutí
4. **Kontrola**: Člověk zkontroluje akci v dashboardu nebo e-mailu
5. **Rozhodnutí**:
   - **Schválení**: Akce je okamžitě provedena
   - **Zamítnutí**: Akce je zrušena
   - **Timeout**: Akce vyprší po nakonfigurovaném čase (výchozí: 24h)
6. **Potvrzení**: E-mailová notifikace o výsledku provedení

### Metody schvalování

#### Přes dashboard
1. Otevřete dashboard
2. Najděte akci v sekci "Ke schválení"
3. Klikněte na náhled (oko) pro zobrazení detailů
4. Klikněte na schválit (fajfka) nebo zamítnout (X)

#### Přes e-mail
1. Obdržíte e-mail s žádostí o schválení
2. Klikněte na odkaz "Schválit" nebo "Zamítnout"
3. Prohlížeč otevře stránku s potvrzením

### Typy akcí

| Typ | Popis |
|-----|-------|
| `create_post` | Vytvoření nového Facebook příspěvku |
| `boost_post` | Propagace existujícího příspěvku s reklamním rozpočtem |
| `create_campaign` | Vytvoření nové reklamní kampaně |
| `adjust_budget` | Úprava rozpočtu kampaně |
| `pause_campaign` | Pozastavení aktivní kampaně |
| `resume_campaign` | Obnovení pozastavené kampaně |

---

## Plánovač

Agent automaticky spouští naplánované úlohy:

| Úloha | Čas | Popis |
|-------|-----|-------|
| Ranní analýza | 6:00 denně | Analyzuje výkon kampaní |
| Návrh obsahu | 8:00 denně | Generuje návrh příspěvku |
| Kontrola výkonu | 12:00, 18:00 denně | Kontroluje problémy s výkonem |
| Optimalizace rozpočtu | 20:00 denně | Navrhuje úpravy rozpočtu |
| Denní report | 21:00 denně | Odesílá denní shrnutí e-mailem |
| Týdenní report | Neděle 18:00 | Odesílá týdenní shrnutí |
| Expirace akcí | Každou hodinu | Expiruje staré čekající akce |
| Zpracování schválených | Každých 5 minut | Provádí schválené akce |

Všechny naplánované úlohy, které generují doporučení, automaticky zařazují akce ke schválení.

---

## API Reference

### Dashboard API

#### GET /api/dashboard
Vrací data dashboardu včetně stavu agenta, rozpočtu, cílů a akcí.

#### GET /api/settings
Vrací aktuální konfiguraci agenta.

#### PUT /api/settings
Aktualizuje konfiguraci agenta.

#### GET /api/approvals
Vrací seznam akcí čekajících na schválení.

#### GET /api/agent/status
Vrací stav a zdraví agenta.

### Chat API

#### POST /api/chat
Odeslání zprávy AI agentovi.

**Požadavek:**
```json
{
  "message": "Vytvoř příspěvek o zimní údržbě"
}
```

**Odpověď:**
```json
{
  "response": "Zde je návrh příspěvku...",
  "actionQueued": true
}
```

#### GET /api/chat/history
Vrací historii chatových zpráv.

### Webhook endpointy

#### GET /webhook/approve/:token
Schvaluje akci a provede ji.

#### GET /webhook/reject/:token
Zamítne a zruší akci.

#### GET /webhook/view/:token
Zobrazí detaily akce.

#### GET /webhook/edit/:token
Zobrazí formulář pro úpravu obsahu příspěvku.

#### POST /webhook/edit/:token
Odešle upravený obsah a schválí.

---

## Architektura

### Struktura projektu

```
Facebook_marketing/
├── src/
│   ├── agent/           # Typy a rozhraní agenta
│   ├── ai/              # AI klient a prompty
│   │   ├── client.ts    # Anthropic API klient
│   │   ├── brain.ts     # Hlavní AI logika
│   │   └── prompts/     # Systémové prompty
│   ├── approval/        # Workflow schvalování
│   │   ├── queue.ts     # Správa fronty akcí
│   │   └── executor.ts  # Provádění akcí
│   ├── database/        # SQLite databáze
│   │   └── repositories/
│   ├── email/           # E-mailová služba
│   │   ├── sender.ts    # Odesílání e-mailů
│   │   └── templates/   # E-mailové šablony
│   ├── scheduler/       # Cron plánovač
│   │   └── tasks/       # Naplánované úlohy
│   ├── server/          # Express HTTP server
│   │   └── routes/      # API cesty
│   └── main.ts          # Vstupní bod aplikace
├── dashboard/           # Frontend soubory
│   ├── css/
│   ├── js/
│   └── *.html
├── data/                # SQLite databázové soubory
└── docs/                # Dokumentace
```

### Technologický stack

- **Runtime**: Node.js 18+
- **Jazyk**: TypeScript
- **Web Framework**: Express.js
- **Databáze**: SQLite (better-sqlite3)
- **AI**: Anthropic Claude API
- **Plánovač**: node-cron
- **E-mail**: Nodemailer
- **Bezpečnost**: Helmet, rate-limiting

### Tok dat

```
Požadavek uživatele → Chat API → AI Brain → Fronta akcí → Schválení
                                                 ↓
                                      E-mailová notifikace
                                                 ↓
                                   Lidské schválení/zamítnutí
                                                 ↓
                                    Executor akcí → Facebook API
                                                 ↓
                                      Potvrzovací e-mail
```

---

## Řešení problémů

### Agent se nespustí

**Port je již používán:**
```bash
fuser -k 6081/tcp
npm run start:agent
```

**Chybí proměnné prostředí:**
- Zkontrolujte, že soubor `.env` existuje a obsahuje všechny požadované proměnné
- Ujistěte se, že kolem hodnot se speciálními znaky nejsou uvozovky

### E-mail se neodesílá

**Gmail blokuje přihlášení:**
- Použijte heslo aplikace místo běžného hesla
- Povolte "Přístup méně bezpečných aplikací" nebo použijte OAuth2

**Špatné SMTP nastavení:**
- Gmail: `smtp.gmail.com:587`
- Ujistěte se, že `SMTP_SECURE=false` pro port 587

### AI neodpovídá

**Neplatný API klíč:**
- Ověřte, že `ANTHROPIC_API_KEY` je správný
- Zkontrolujte, že API klíč má dostatečný kredit

**Rate limiting:**
- Snižte frekvenci požadavků
- Zkontrolujte Anthropic dashboard pro využití

### Chyby Facebook API

**Neplatný token:**
- Znovu vygenerujte Page Access Token
- Ujistěte se, že token má požadovaná oprávnění

**Přístup odepřen:**
- Vyžádejte další oprávnění v Graph API Explorer
- Ověřte, že aplikace je v živém režimu (ne ve vývojovém)

### Dashboard se nenačítá

**CORS problémy:**
- Zkontrolujte, že `BASE_URL` odpovídá skutečné URL serveru
- Ujistěte se, že CORS middleware je povolen

**Statické soubory nenalezeny:**
- Ověřte, že složka dashboard existuje
- Zkontrolujte oprávnění souborů

### Problémy specifické pro prohlížeč

**Chrome ERR_ADDRESS_UNREACHABLE:**
- Zkontrolujte `chrome://flags/#block-insecure-private-network-requests`
- Deaktivujte tento příznak pro přístup k lokální síti
- Nebo použijte Safari/Firefox

---

## Podpora

Pro problémy a požadavky na funkce vytvořte issue v repozitáři.

---

## Licence

MIT Licence - Viz soubor LICENSE pro detaily.
