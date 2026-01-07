# Facebook Marketing Suite

This project includes two components:

1. **AI Marketing Agent** - Autonomous marketing agent with dashboard
2. **MCP Server** - Model Context Protocol server for Claude Desktop

---

## AI Marketing Agent

An autonomous AI-powered marketing agent that manages Facebook advertising campaigns, creates content, and optimizes performance with human-in-the-loop approval workflow.

### Quick Start

```bash
npm install
npm run build:agent
npm run start:agent
```

Then open: `http://localhost:6081/dashboard`

### Documentation / Dokumentace

| Language | Document |
|----------|----------|
| English | [docs/README.en.md](docs/README.en.md) |
| Čeština | [docs/README.cs.md](docs/README.cs.md) |
| API Reference | [docs/API.md](docs/API.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

### Features

- AI-powered content generation (Claude)
- Campaign performance analysis
- Budget optimization
- Human-in-the-loop approval workflow
- Email notifications
- Web dashboard with real-time updates
- Scheduled automated tasks

---

## MCP Server (Facebook Ads)

This project also provides a Model Context Protocol (MCP) server designed to interact with the Facebook Marketing API, allowing AI assistants like Claude to manage and analyze Facebook ad campaigns, ad sets, audiences, and more.

## Features

*   **Campaign Management**: Create, read, update, delete campaigns.
*   **Audience Management**: Create custom and lookalike audiences, list audiences.
*   **Ad Set Management**: Create ad sets (basic implementation).
*   **Post Management**: Create organic posts on Facebook Pages.
*   **Analytics**: Get campaign insights.
*   **AI Assistance**: Generate prompts for campaign creation based on templates.

## Prerequisites

*   Node.js (v18 or later recommended)
*   npm (comes with Node.js)
*   A Facebook App with access to the Marketing API
*   A Facebook Ad Account ID
*   An Access Token with `ads_management` and `ads_read` permissions

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Tisik79/ai-marketing-agent.git
    cd ai-marketing-agent
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment Variables:**
    Copy the `.env.example` file to `.env` in the project root and add your Facebook App credentials:
    ```bash
    cp .env.example .env
    ```
    Then edit the `.env` file with your actual values.

## License

This project is licensed under the MIT License.
