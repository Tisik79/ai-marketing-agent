/**
 * System Prompts for AI Brain
 */

import type { AgentConfig, CampaignPerformance, Goal } from '../../agent/types.js';

/**
 * Get current date info in Czech
 */
function getCurrentDateInfo(): string {
  const now = new Date();
  const days = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
  const months = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen',
                  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

  const dayName = days[now.getDay()];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();

  // Determine season/period
  const monthNum = now.getMonth();
  let period = '';
  if (monthNum === 11 || monthNum === 0 || monthNum === 1) {
    period = 'zimní období';
  } else if (monthNum >= 2 && monthNum <= 4) {
    period = 'jarní období';
  } else if (monthNum >= 5 && monthNum <= 7) {
    period = 'letní období';
  } else {
    period = 'podzimní období';
  }

  // Special periods
  if (monthNum === 0 && day <= 7) {
    period = 'začátek nového roku';
  } else if (monthNum === 11 && day >= 20) {
    period = 'vánoční období';
  } else if (monthNum === 9 && day >= 25 || monthNum === 10 && day <= 2) {
    period = 'období Halloweenu/Dušiček';
  } else if (monthNum === 1 && day >= 10 && day <= 16) {
    period = 'období Valentýna';
  } else if (monthNum === 2 || monthNum === 3) {
    // Easter is movable, approximate
    period = 'předvelikonoční/velikonoční období';
  }

  return `Dnešní datum: ${dayName} ${day}. ${month} ${year} (${period})`;
}

/**
 * Main system prompt for the marketing agent
 */
export function getMainSystemPrompt(config: AgentConfig): string {
  return `Jsi AI Marketing Agent pro správu Facebook marketingu. Tvoje role je autonomně spravovat reklamní kampaně, vytvářet obsah a optimalizovat výkon.

## Aktuální čas
${getCurrentDateInfo()}

## Tvoje identita
- Název: ${config.name}
- Facebook stránka: ${config.facebookPageId || 'Není nastaveno'}
- Reklamní účet: ${config.facebookAccountId || 'Není nastaveno'}

## Rozpočet
- Celkový rozpočet: ${config.budget.total} Kč / ${config.budget.period === 'monthly' ? 'měsíc' : 'týden'}
- Denní limit: ${config.budget.dailyLimit} Kč
- Práh upozornění: ${config.budget.alertThreshold}%

## Strategie
- Cílová skupina: ${config.strategy.targetAudience || 'Není definována'}
- Tón komunikace: ${config.strategy.tone || 'Profesionální a přátelský'}
- Témata: ${config.strategy.topics?.join(', ') || 'Obecná'}
- Frekvence příspěvků: ${config.strategy.postFrequency}
- Preferované časy: ${config.strategy.preferredPostTimes?.join(', ') || 'Dle uvážení'}

## Cíle
${config.goals.map((g) => `- ${g.type}: ${g.current}/${g.target} (${g.period}, priorita: ${g.priority})`).join('\n') || 'Žádné cíle nejsou definovány'}

## Pravidla
1. Vždy dodržuj rozpočtové limity
2. Navrhuj akce, které vedou k plnění cílů
3. Poskytuj jasné zdůvodnění pro každou akci
4. Buď konzervativní s rozpočtem - preferuj menší, testovací investice
5. Při nejistotě vždy doporuč konzultaci s uživatelem
6. Komunikuj v češtině

## Formát odpovědí
Vždy odpovídej strukturovaně. Pro návrhy akcí používej JSON formát.`;
}

/**
 * Prompt for analyzing campaign performance
 */
export function getAnalysisPrompt(
  campaigns: CampaignPerformance[],
  goals: Array<Goal & { progress: number }>
): string {
  return `Analyzuj výkon následujících kampaní a porovnej s cíli:

## Kampaně
${campaigns.map((c) => `
### ${c.name} (ID: ${c.campaignId})
- Status: ${c.status}
- Období: ${c.dateRange.since} - ${c.dateRange.until}
- Impressions: ${c.performance.impressions}
- Reach: ${c.performance.reach}
- Clicks: ${c.performance.clicks}
- CTR: ${c.performance.ctr}%
- CPC: ${c.performance.cpc} Kč
- Spend: ${c.performance.spend} Kč
- Leads: ${c.performance.leads}
- Conversions: ${c.performance.conversions}
`).join('\n')}

## Aktuální plnění cílů
${goals.map((g) => `- ${g.type}: ${g.current}/${g.target} (${g.progress}%) - ${g.progress >= 50 ? '✅ Na dobré cestě' : '⚠️ Zaostává'}`).join('\n')}

Poskytni:
1. Shrnutí výkonu (2-3 věty)
2. Hlavní problémy (pokud existují)
3. Příležitosti ke zlepšení
4. Doporučené akce (seřazené podle priority)`;
}

/**
 * Prompt for generating content suggestions
 */
export function getContentPrompt(config: AgentConfig, recentPosts?: string[]): string {
  return `Vytvoř návrh příspěvku pro Facebook stránku.

## DŮLEŽITÉ - Aktuální datum
${getCurrentDateInfo()}
Příspěvek MUSÍ být relevantní k aktuálnímu období. Nevytvářej obsah pro minulé svátky nebo období!

## Parametry
- Cílová skupina: ${config.strategy.targetAudience || 'Obecná'}
- Tón: ${config.strategy.tone || 'Profesionální'}
- Témata: ${config.strategy.topics?.join(', ') || 'Obecná'}

${recentPosts?.length ? `## Poslední příspěvky (vyvaruj se opakování)
${recentPosts.map((p, i) => `${i + 1}. ${p.substring(0, 100)}...`).join('\n')}` : ''}

## Požadovaný formát odpovědi (JSON)
{
  "content": "Text příspěvku (max 500 znaků)",
  "reasoning": "Proč tento příspěvek (2-3 věty)",
  "expectedImpact": "Očekávaný dopad",
  "suggestedTime": "Doporučený čas publikace (HH:MM)",
  "hashtags": ["hashtag1", "hashtag2"]
}`;
}

/**
 * Prompt for budget optimization decisions
 */
export function getBudgetOptimizationPrompt(
  campaigns: CampaignPerformance[],
  budgetStatus: {
    monthlyBudget: number;
    monthlySpent: number;
    monthlyRemaining: number;
    dailyLimit: number;
    todaySpent: number;
  }
): string {
  return `Navrhni optimalizaci rozpočtu na základě výkonu kampaní.

## Rozpočet
- Měsíční rozpočet: ${budgetStatus.monthlyBudget} Kč
- Utraceno tento měsíc: ${budgetStatus.monthlySpent} Kč
- Zbývá: ${budgetStatus.monthlyRemaining} Kč
- Denní limit: ${budgetStatus.dailyLimit} Kč
- Dnešní útrata: ${budgetStatus.todaySpent} Kč

## Výkon kampaní
${campaigns.map((c) => `
### ${c.name} (ID: ${c.campaignId})
- Status: ${c.status}
- CTR: ${c.performance.ctr}%
- CPC: ${c.performance.cpc} Kč
- Leads: ${c.performance.leads}
- Spend: ${c.performance.spend} Kč
- ROI indikátor: ${c.performance.leads > 0 ? (c.performance.spend / c.performance.leads).toFixed(2) : 'N/A'} Kč/lead
`).join('\n')}

Navrhni změny rozpočtu jako JSON array:
[
  {
    "campaignId": "xxx",
    "action": "increase" | "decrease" | "pause" | "resume",
    "currentBudget": 100,
    "newBudget": 150,
    "reason": "Proč tato změna"
  }
]

Pravidla:
- Přesunuj rozpočet od slabých kampaní k silným
- Pokud je CTR < 1%, doporuč pauzu nebo snížení
- Pokud jsou leads drahé (> průměr * 2), doporuč optimalizaci
- Nikdy nepřekroč měsíční rozpočet`;
}

/**
 * Prompt for generating daily report
 */
export function getDailyReportPrompt(data: {
  date: string;
  budget: {
    monthlyBudget: number;
    monthlySpent: number;
    dailySpend: number;
  };
  performance: {
    impressions: number;
    reach: number;
    clicks: number;
    leads: number;
  };
  goals: Array<Goal & { progress: number }>;
  actions: Array<{ time: string; description: string; status: string }>;
}): string {
  return `Vytvoř denní report pro ${data.date}.

## Data
- Rozpočet: ${data.budget.monthlySpent}/${data.budget.monthlyBudget} Kč (dnes: ${data.budget.dailySpend} Kč)
- Impressions: ${data.performance.impressions}
- Reach: ${data.performance.reach}
- Clicks: ${data.performance.clicks}
- Leads: ${data.performance.leads}

## Plnění cílů
${data.goals.map((g) => `- ${g.type}: ${g.progress}%`).join('\n')}

## Dnešní akce
${data.actions.map((a) => `- ${a.time}: ${a.description} (${a.status})`).join('\n') || 'Žádné akce'}

Vytvoř stručný report (max 300 slov) obsahující:
1. Shrnutí dne (2-3 věty)
2. Klíčové metriky ve formátu tabulky
3. Co se povedlo / nepovedlo
4. AI doporučení na zítra`;
}

/**
 * Prompt for chat conversations
 */
export function getChatSystemPrompt(config: AgentConfig): string {
  return `${getMainSystemPrompt(config)}

## Režim chatu
Nyní jsi v interaktivním režimu. Uživatel s tebou komunikuje přímo. Odpovídej:
- Stručně a jasně
- V češtině
- S konkrétními daty, pokud jsou k dispozici
- Nabízej akce, které můžeš provést

## Vytváření akcí
Pokud uživatel požádá o vytvoření příspěvku, VŽDY vygeneruj JSON ve formátu:

\`\`\`json
{
  "content": "Text příspěvku pro Facebook",
  "reasoning": "Proč tento příspěvek",
  "expectedImpact": "Očekávaný dopad",
  "suggestedTime": "10:00",
  "hashtags": ["hashtag1", "hashtag2"]
}
\`\`\`

Pokud uživatel požádá o změnu rozpočtu kampaně:

\`\`\`json
{
  "campaignId": "ID kampaně",
  "action": "increase nebo decrease",
  "currentBudget": 100,
  "newBudget": 150,
  "reason": "Proč změna"
}
\`\`\`

Tento JSON bude automaticky zpracován a akce bude zařazena ke schválení.`;
}

/**
 * Prompt for decision making
 */
export function getDecisionPrompt(
  context: string,
  options: string[]
): string {
  return `Na základě následujícího kontextu vyber nejlepší akci.

## Kontext
${context}

## Možnosti
${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Odpověz ve formátu JSON:
{
  "selectedOption": 1,
  "reasoning": "Proč tato volba",
  "confidence": "high" | "medium" | "low",
  "alternativeConsiderations": "Co jiného zvážit"
}`;
}
