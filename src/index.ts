import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport as StdioTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { initFacebookSdk, validateConfig } from './config.js';
import * as campaignTools from './tools/campaign-tools.js';
import * as audienceTools from './tools/audience-tools.js';
import * as analyticsTools from './tools/analytics-tools.js';
import * as adSetTools from './tools/adset-tools.js';
import * as postTools from './tools/post-tools.js';

const initializeServer = async (): Promise<McpServer> => {
  if (!validateConfig()) {
    console.error('Neplatná konfigurace. Zkontrolujte .env soubor nebo proměnné prostředí.');
    throw new Error('Neplatná konfigurace. Zkontrolujte .env soubor nebo proměnné prostředí.');
  }

  try {
    initFacebookSdk();
  } catch (error) {
    throw new Error(`Chyba při inicializaci Facebook SDK: ${error instanceof Error ? error.message : error}`);
  }

  const server = new McpServer({
    name: 'facebook-ads-mcp-server',
    version: '1.0.0',
  });

  // Campaign tools
  server.tool(
    'create_campaign',
    {
      name: z.string().describe('Název kampaně'),
      objective: z.string().describe('Cíl kampaně'),
      status: z.string().describe('Status kampaně (ACTIVE, PAUSED)'),
      dailyBudget: z.string().optional().describe('Denní rozpočet'),
      startTime: z.string().optional().describe('Čas začátku'),
      endTime: z.string().optional().describe('Čas konce'),
      special_ad_categories: z.array(z.string()).nonempty().describe('Speciální kategorie reklam')
    },
    async ({ name, objective, status, dailyBudget, startTime, endTime, special_ad_categories }) => {
      const result = await campaignTools.createCampaign(
        name, objective, status, dailyBudget ? parseFloat(dailyBudget) : undefined,
        startTime, endTime, special_ad_categories
      );
      return { content: [{ type: 'text', text: result.success ? `Kampaň vytvořena (ID: ${result.campaignId})` : `Chyba: ${result.message}` }] };
    }
  );

  server.tool('get_campaigns', { limit: z.string().optional(), status: z.string().optional() },
    async ({ limit, status }) => {
      const result = await campaignTools.getCampaigns(limit ? parseInt(limit) : undefined, status);
      if (!result.success) return { content: [{ type: 'text', text: `Chyba: ${result.message}` }], isError: true };
      let text = `Kampaně (${result.campaigns?.length || 0}):\n`;
      result.campaigns?.forEach((c: any, i: number) => { text += `${i+1}. ${c.name} (${c.id}) - ${c.status}\n`; });
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('get_campaign_details', { campaignId: z.string() },
    async ({ campaignId }) => {
      const result = await campaignTools.getCampaignDetails(campaignId);
      if (!result.success) return { content: [{ type: 'text', text: `Chyba: ${result.message}` }], isError: true };
      return { content: [{ type: 'text', text: JSON.stringify(result.campaign, null, 2) }] };
    }
  );

  server.tool('update_campaign', { campaignId: z.string(), name: z.string().optional(), status: z.string().optional(), dailyBudget: z.string().optional(), endTime: z.string().optional() },
    async ({ campaignId, name, status, dailyBudget, endTime }) => {
      const result = await campaignTools.updateCampaign(campaignId, name, status, dailyBudget ? parseFloat(dailyBudget) : undefined, endTime);
      return { content: [{ type: 'text', text: result.success ? 'Kampaň aktualizována' : `Chyba: ${result.message}` }] };
    }
  );

  server.tool('delete_campaign', { campaignId: z.string() },
    async ({ campaignId }) => {
      const result = await campaignTools.deleteCampaign(campaignId);
      return { content: [{ type: 'text', text: result.success ? 'Kampaň smazána' : `Chyba: ${result.message}` }] };
    }
  );

  // Analytics tools
  server.tool('get_campaign_insights', { campaignId: z.string(), since: z.string(), until: z.string(), metrics: z.string().optional() },
    async ({ campaignId, since, until, metrics }) => {
      const metricsArray = metrics ? metrics.split(',').map(m => m.trim()) : ['impressions', 'clicks', 'spend', 'cpc', 'ctr', 'reach'];
      const result = await analyticsTools.getCampaignInsights(campaignId, { since, until }, metricsArray);
      if (!result.success) return { content: [{ type: 'text', text: `Chyba: ${result.message}` }], isError: true };
      return { content: [{ type: 'text', text: JSON.stringify(result.insights, null, 2) }] };
    }
  );

  server.tool('get_adset_insights', { adSetId: z.string(), since: z.string(), until: z.string(), metrics: z.string().optional() },
    async ({ adSetId, since, until, metrics }) => {
      const metricsArray = metrics ? metrics.split(',').map(m => m.trim()) : ['impressions', 'clicks', 'spend'];
      const result = await analyticsTools.getAdSetInsights(adSetId, { since, until }, metricsArray);
      return { content: [{ type: 'text', text: result.success ? JSON.stringify(result.insights, null, 2) : `Chyba: ${result.message}` }] };
    }
  );

  server.tool('get_ad_insights', { adId: z.string(), since: z.string(), until: z.string(), metrics: z.string().optional() },
    async ({ adId, since, until, metrics }) => {
      const metricsArray = metrics ? metrics.split(',').map(m => m.trim()) : ['impressions', 'clicks', 'spend'];
      const result = await analyticsTools.getAdInsights(adId, { since, until }, metricsArray);
      return { content: [{ type: 'text', text: result.success ? JSON.stringify(result.insights, null, 2) : `Chyba: ${result.message}` }] };
    }
  );

  server.tool('get_adsets', { campaignId: z.string().optional(), limit: z.string().optional(), status: z.string().optional() },
    async ({ campaignId, limit, status }) => {
      const result = await analyticsTools.getAdSets(campaignId, limit ? parseInt(limit) : 25, status);
      return { content: [{ type: 'text', text: result.success ? JSON.stringify(result.adSets, null, 2) : `Chyba: ${result.message}` }] };
    }
  );

  server.tool('get_ads', { adSetId: z.string().optional(), campaignId: z.string().optional(), limit: z.string().optional(), status: z.string().optional() },
    async ({ adSetId, campaignId, limit, status }) => {
      const result = await analyticsTools.getAds(adSetId, campaignId, limit ? parseInt(limit) : 25, status);
      return { content: [{ type: 'text', text: result.success ? JSON.stringify(result.ads, null, 2) : `Chyba: ${result.message}` }] };
    }
  );

  // Audience tools
  server.tool('create_custom_audience', { name: z.string(), subtype: z.string(), description: z.string().optional(), customer_file_source: z.string().optional() },
    async ({ name, subtype, description, customer_file_source }) => {
      const result = await audienceTools.createCustomAudience(name, description || '', customer_file_source || '', subtype);
      return { content: [{ type: 'text', text: result.success ? `Publikum vytvořeno (ID: ${result.audienceId})` : `Chyba: ${result.message}` }] };
    }
  );

  server.tool('get_audiences', { limit: z.string().optional() },
    async ({ limit }) => {
      const result = await audienceTools.getCustomAudiences(limit ? parseInt(limit) : undefined);
      return { content: [{ type: 'text', text: result.success ? JSON.stringify(result.audiences, null, 2) : `Chyba: ${result.message}` }] };
    }
  );

  server.tool('create_lookalike_audience', { sourceAudienceId: z.string(), name: z.string(), description: z.string().optional(), country: z.string(), ratio: z.number().optional() },
    async ({ sourceAudienceId, name, description, country, ratio }) => {
      const result = await audienceTools.createLookalikeAudience(sourceAudienceId, name, description || '', country, ratio);
      return { content: [{ type: 'text', text: result.success ? `Lookalike vytvořeno (ID: ${result.audienceId})` : `Chyba: ${result.message}` }] };
    }
  );

  // Ad Set tools
  server.tool('create_ad_set', { campaignId: z.string(), name: z.string(), status: z.string(), targeting: z.any(), optimizationGoal: z.string(), billingEvent: z.string(), bidAmount: z.number().optional(), dailyBudget: z.number().optional(), lifetimeBudget: z.number().optional(), startTime: z.string().optional(), endTime: z.string().optional() },
    async (params) => {
      const result = await adSetTools.createAdSet(params.campaignId, params.name, params.status, params.targeting, params.optimizationGoal, params.billingEvent, params.bidAmount, params.dailyBudget, params.lifetimeBudget, params.startTime, params.endTime);
      return { content: [{ type: 'text', text: result.success ? `Ad Set vytvořen (ID: ${result.adSetId})` : `Chyba: ${result.message}` }] };
    }
  );

  // Post tools
  server.tool('create_post', { content: z.string(), link: z.string().optional(), imagePath: z.string().optional() },
    async ({ content, link, imagePath }) => {
      try {
        const postId = await postTools.create_post(content, link, imagePath);
        return { content: [{ type: 'text', text: `Příspěvek vytvořen (ID: ${postId})` }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Chyba: ${error.message}` }], isError: true };
      }
    }
  );

  return server;
};

const startServer = async () => {
  try {
    const server = await initializeServer();
    const transport = new StdioTransport();
    const shutdown = async () => { process.exit(0); };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    await server.connect(transport);
  } catch (error) {
    console.error(`Kritická chyba: ${error instanceof Error ? error.stack : error}`);
    process.exit(1);
  }
};

startServer();
