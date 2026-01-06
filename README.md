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
    git clone https://github.com/Tisik79/MCP-Facebook.git
    cd MCP-Facebook
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
    Then edit the `.env` file with your actual values:
    ```dotenv
    FACEBOOK_APP_ID=YOUR_APP_ID
    FACEBOOK_APP_SECRET=YOUR_APP_SECRET
    FACEBOOK_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
    FACEBOOK_ACCOUNT_ID=act_YOUR_ACCOUNT_ID
    PORT=3000
    ```
    Replace placeholders with your actual values. **Ensure the Access Token has the `ads_management` and `pages_manage_posts` permissions.**

    > **Security Note**: Never commit your `.env` file to version control. The `.env` file is already included in `.gitignore`.

## Usage

1.  **Build the server:**
    ```bash
    npm run build
    ```
    This compiles the TypeScript code to JavaScript in the `dist` folder.

2.  **Run the server:**
    ```bash
    npm start
    ```
    The server will start and listen for MCP connections via stdio.

3.  **Connect with an MCP Client (e.g., Claude Desktop):**
    Follow the instructions in `CLAUDE_DESKTOP_GUIDE.md` to configure your MCP client to connect to this server using the `npm start` command or by directly running `node dist/index.js`.

## Available Tools (via MCP)

### Campaign Management
*   `create_campaign`: Creates a new ad campaign.
*   `get_campaigns`: Lists existing campaigns.
*   `get_campaign_details`: Gets details for a specific campaign.
*   `update_campaign`: Updates an existing campaign.
*   `delete_campaign`: Deletes a campaign.

### Ad Set Management
*   `create_ad_set`: Creates a new ad set.
*   `get_adsets`: Lists ad sets with optional filtering by campaign, status, and limit.

### Ad Management
*   `get_ads`: Lists ads with optional filtering by ad set, campaign, status, and limit.

### Audience Management
*   `create_custom_audience`: Creates a custom, website, or engagement audience.
*   `get_audiences`: Lists available custom audiences.
*   `create_lookalike_audience`: Creates a lookalike audience.

### Post Management
*   `create_post`: Creates an organic post on a Facebook Page. Supports text posts, posts with links, and posts with images.

### Analytics
*   `get_campaign_insights`: Retrieves performance insights for a campaign.
*   `get_adset_insights`: Retrieves performance insights for an ad set.
*   `get_ad_insights`: Retrieves performance insights for an individual ad.

Refer to the server's tool descriptions in your MCP client for detailed parameter information.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

This project is licensed under the MIT License.