# AI Marketing Agent for Facebook

An autonomous AI-powered marketing agent that manages Facebook advertising campaigns, creates content, and optimizes performance with human-in-the-loop approval workflow.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Requirements](#requirements)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [Dashboard](#dashboard)
8. [Approval System](#approval-system)
9. [Scheduler](#scheduler)
10. [API Reference](#api-reference)
11. [Architecture](#architecture)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The AI Marketing Agent is a Node.js application that uses Claude AI (Anthropic) to autonomously manage Facebook marketing activities. It features:

- **Autonomous Content Creation**: AI generates Facebook posts based on your brand strategy
- **Campaign Analysis**: Analyzes campaign performance and suggests optimizations
- **Budget Management**: Monitors spending and optimizes budget allocation
- **Human-in-the-Loop Approval**: All actions require human approval before execution
- **Email Notifications**: Sends approval requests and daily reports via email
- **Web Dashboard**: Real-time monitoring and management interface

---

## Features

### AI-Powered Content Generation
- Creates engaging Facebook posts tailored to your target audience
- Considers current date, season, and relevant events
- Suggests optimal posting times and hashtags
- **Image generation using Nano Banana (Gemini 2.5 Flash Image)** - AI automatically creates images for posts
- Option to upload custom images via chat interface

### Campaign Performance Analysis
- Analyzes impressions, reach, clicks, CTR, CPC, and conversions
- Identifies problems and opportunities
- Generates actionable recommendations

### Budget Optimization
- Monitors daily and monthly spending
- Suggests budget reallocation between campaigns
- Sends alerts when approaching budget limits

### Approval Workflow
- All AI-suggested actions are queued for human approval
- Approve, reject, or edit actions via dashboard or email links
- Configurable timeout for pending actions

### Scheduled Tasks
- Morning analysis (6:00)
- Content suggestions (8:00)
- Performance checks (12:00, 18:00)
- Budget optimization (20:00)
- Daily reports (21:00)
- Weekly reports (Sunday 18:00)

### Email Notifications
- Approval request emails with one-click approve/reject links
- Daily performance reports
- Budget alerts
- Execution confirmations

---

## Requirements

- Node.js 18+
- npm or yarn
- Facebook Business Account with:
  - Facebook Page
  - Facebook Ads Account
  - Page Access Token
- Anthropic API Key (Claude)
- SMTP server for email notifications (e.g., Gmail)
- Google AI API Key (optional, for image generation via Nano Banana)

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Facebook_marketing
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file and edit it:

```bash
cp .env.example .env
nano .env
```

### 4. Build the Application

```bash
npm run build:agent
```

### 5. Start the Agent

```bash
npm run start:agent
```

The agent will start on `http://localhost:6081` by default.

---

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Facebook API
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_ACCESS_TOKEN=your_access_token
FACEBOOK_ACCOUNT_ID=act_your_account_id
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
FACEBOOK_BUSINESS_ID=your_business_id

# Server
PORT=6081
HOST=0.0.0.0
BASE_URL=http://your-server-ip:6081

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-...

# Google AI (optional - for image generation)
# Get it from: https://aistudio.google.com/app/apikey
GOOGLE_AI_API_KEY=AIzaSy-...

# Agent Configuration
AGENT_NAME=Marketing Agent
MONTHLY_BUDGET=10000
DAILY_LIMIT=500
BUDGET_ALERT_THRESHOLD=80

# Email SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@example.com
SMTP_PASS=<your-smtp-password>
EMAIL_FROM=AI Marketing Agent <noreply@example.com>
EMAIL_TO=admin@example.com

# Logging
LOG_LEVEL=info
```

### Facebook Setup

1. **Create a Facebook App** at [developers.facebook.com](https://developers.facebook.com)
2. **Get Page Access Token**:
   - Go to Graph API Explorer
   - Select your app and page
   - Request `pages_manage_posts`, `pages_read_engagement`, `ads_management` permissions
   - Generate long-lived token

3. **Get Ads Account ID**:
   - Go to Facebook Ads Manager
   - Your account ID is in the URL: `act_XXXXXXXXX`

### Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Google Account
2. Generate an App Password:
   - Go to Google Account → Security → App Passwords
   - Create a new app password for "Mail"
3. Use this password as `SMTP_PASS`

---

## Usage

### Starting the Agent

```bash
# Development mode (with auto-reload)
npm run dev:agent

# Production mode
npm run start:agent

# Run in background
npm run start:agent > /tmp/agent.log 2>&1 &
```

### Accessing the Dashboard

Open your browser and navigate to:
```
http://your-server-ip:6081/dashboard
```

### Chat Interface

The chat interface allows direct interaction with the AI:
```
http://your-server-ip:6081/dashboard/chat.html
```

Example commands:
- "Create a post about winter home maintenance"
- "Create a post with an image about spring garden care" (AI will generate image via Nano Banana)
- "How is our budget looking?"
- "Analyze campaign performance"
- "What posts should we publish this week?"

**Image Generation:**
- AI can automatically generate images for posts using Nano Banana (Gemini 2.5 Flash Image)
- You can also upload your own image by clicking the image icon in chat
- Images are optimized for Central European context

---

## Dashboard

### Main Dashboard (`/dashboard`)

The main dashboard displays:

- **Agent Status**: Shows if the agent is active
- **Budget Overview**: Monthly budget, spent amount, remaining
- **KPI Cards**: Reach, leads, CTR metrics
- **Performance Chart**: 7-day performance graph
- **Goals Progress**: Visual progress toward defined goals
- **Pending Actions**: Actions waiting for approval with preview
- **Recent Actions**: History of executed actions

### Pending Actions

Each pending action shows:
- Action type (New Post, Budget Adjustment, etc.)
- Expiration time
- Preview button (eye icon) - opens modal with full content preview
- Approve button (checkmark) - executes the action
- Reject button (X) - cancels the action

### Preview Modal

Clicking the preview button opens a modal showing:
- Full post content as it will appear on Facebook
- **Image preview** (if generated via Nano Banana or uploaded by user)
- AI reasoning for the suggestion
- Expected impact
- Confidence level (High/Medium/Low)
- Approve/Reject buttons
- **Regenerate image button** (for images generated via Nano Banana)

### Chat Interface (`/dashboard/chat.html`)

Interactive chat with the AI agent:
- Ask questions about campaigns
- Request content creation
- Get performance insights
- Actions suggested in chat are automatically queued for approval

### Settings (`/dashboard/settings.html`)

Configure:
- Agent name
- Monthly budget and daily limit
- Alert thresholds
- Target audience
- Communication tone
- Topics and posting frequency
- Email settings

---

## Approval System

### Workflow

1. **Action Creation**: AI suggests an action (post, budget change, etc.)
2. **Queue**: Action is added to approval queue with unique token
3. **Notification**: Email is sent with approve/reject links
4. **Review**: Human reviews action in dashboard or email
5. **Decision**:
   - **Approve**: Action is executed immediately
   - **Reject**: Action is cancelled
   - **Timeout**: Action expires after configured hours (default: 24h)
6. **Confirmation**: Email notification of execution result

### Approval Methods

#### Via Dashboard
1. Open dashboard
2. Find action in "Pending Actions" section
3. Click preview (eye) to review details
4. Click approve (checkmark) or reject (X)

#### Via Email
1. Receive approval request email
2. Click "Approve" or "Reject" link
3. Browser opens with confirmation

### Action Types

| Type | Description |
|------|-------------|
| `create_post` | Create new Facebook post |
| `boost_post` | Boost existing post with ad spend |
| `create_campaign` | Create new ad campaign |
| `adjust_budget` | Modify campaign budget |
| `pause_campaign` | Pause active campaign |
| `resume_campaign` | Resume paused campaign |

---

## Scheduler

The agent runs scheduled tasks automatically:

| Task | Schedule | Description |
|------|----------|-------------|
| Morning Analysis | 6:00 daily | Analyzes campaign performance |
| Content Suggestion | 8:00 daily | Generates post suggestion |
| Performance Check | 12:00, 18:00 daily | Checks for performance issues |
| Budget Optimization | 20:00 daily | Suggests budget adjustments |
| Daily Report | 21:00 daily | Sends daily summary email |
| Weekly Report | Sunday 18:00 | Sends weekly summary |
| Expire Actions | Every hour | Expires old pending actions |
| Process Approved | Every 5 minutes | Executes approved actions |

All scheduled tasks that generate recommendations automatically queue actions for approval.

---

## API Reference

### Dashboard API

#### GET /api/dashboard
Returns dashboard data including agent status, budget, goals, and actions.

#### GET /api/settings
Returns current agent configuration.

#### PUT /api/settings
Updates agent configuration.

#### GET /api/approvals
Returns list of pending approval actions.

#### GET /api/agent/status
Returns agent status and health information.

### Chat API

#### POST /api/chat
Send message to AI agent.

**Request:**
```json
{
  "message": "Create a post about winter maintenance"
}
```

**Response:**
```json
{
  "response": "Here's a post suggestion...",
  "actionQueued": true
}
```

#### GET /api/chat/history
Returns chat message history.

### Webhook Endpoints

#### GET /webhook/approve/:token
Approves action and executes it.

#### GET /webhook/reject/:token
Rejects and cancels action.

#### GET /webhook/view/:token
Shows action details.

#### GET /webhook/edit/:token
Shows edit form for post content.

#### POST /webhook/edit/:token
Submits edited content and approves.

---

## Architecture

### Project Structure

```
Facebook_marketing/
├── src/
│   ├── agent/           # Agent types and interfaces
│   ├── ai/              # AI client and prompts
│   │   ├── client.ts    # Anthropic API client
│   │   ├── brain.ts     # Main AI logic
│   │   └── prompts/     # System prompts
│   ├── approval/        # Approval workflow
│   │   ├── queue.ts     # Action queue management
│   │   └── executor.ts  # Action execution
│   ├── database/        # SQLite database
│   │   └── repositories/
│   ├── email/           # Email service
│   │   ├── sender.ts    # Email sending
│   │   └── templates/   # Email templates
│   ├── scheduler/       # Cron scheduler
│   │   └── tasks/       # Scheduled tasks
│   ├── server/          # Express HTTP server
│   │   └── routes/      # API routes
│   └── main.ts          # Application entry point
├── dashboard/           # Frontend files
│   ├── css/
│   ├── js/
│   └── *.html
├── data/                # SQLite database files
└── docs/                # Documentation
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Web Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **AI**: Anthropic Claude API
- **Scheduler**: node-cron
- **Email**: Nodemailer
- **Security**: Helmet, rate-limiting

### Data Flow

```
User Request → Chat API → AI Brain → Action Queue → Approval
                                          ↓
                               Email Notification
                                          ↓
                              Human Approval/Rejection
                                          ↓
                               Action Executor → Facebook API
                                          ↓
                               Confirmation Email
```

---

## Troubleshooting

### Agent Won't Start

**Port already in use:**
```bash
fuser -k 6081/tcp
npm run start:agent
```

**Missing environment variables:**
- Check `.env` file exists and has all required variables
- Ensure no quotes around values with special characters

### Email Not Sending

**Gmail blocks sign-in:**
- Use App Password instead of regular password
- Enable "Less secure app access" or use OAuth2

**Wrong SMTP settings:**
- Gmail: `smtp.gmail.com:587`
- Ensure `SMTP_SECURE=false` for port 587

### AI Not Responding

**Invalid API key:**
- Verify `ANTHROPIC_API_KEY` is correct
- Check API key has sufficient credits

**Rate limiting:**
- Reduce request frequency
- Check Anthropic dashboard for usage

### Facebook API Errors

**Invalid token:**
- Regenerate Page Access Token
- Ensure token has required permissions

**Permission denied:**
- Request additional permissions in Graph API Explorer
- Verify app is in live mode (not development)

### Dashboard Not Loading

**CORS issues:**
- Check `BASE_URL` matches actual server URL
- Ensure CORS middleware is enabled

**Static files not found:**
- Verify dashboard folder exists
- Check file permissions

### Browser-Specific Issues

**Chrome ERR_ADDRESS_UNREACHABLE:**
- Check `chrome://flags/#block-insecure-private-network-requests`
- Disable this flag for local network access
- Or use Safari/Firefox instead

---

## Support

For issues and feature requests, please create an issue in the repository.

---

## License

MIT License - See LICENSE file for details.
