/**
 * Report Email Templates
 */

import type { Goal } from '../../agent/types.js';

interface DailyReportData {
  agentName: string;
  date: string;
  budget: { total: number; spent: number; remaining: number; percentUsed: number; dailySpend: number; };
  performance: { impressions: number; reach: number; clicks: number; ctr: number; leads: number; conversions: number; };
  previousDay?: { impressions: number; reach: number; clicks: number; leads: number; };
  goals: Array<Goal & { progress: number; onTrack: boolean }>;
  actions: Array<{ time: string; description: string; status: 'success' | 'failed' | 'pending'; }>;
  aiSummary: string;
  recommendations: string[];
}

export function generateDailyReportEmail(data: DailyReportData): string {
  const { agentName, date, budget, performance, previousDay, goals, actions, aiSummary, recommendations } = data;
  const changes = previousDay ? { impressions: calculateChange(performance.impressions, previousDay.impressions), reach: calculateChange(performance.reach, previousDay.reach), clicks: calculateChange(performance.clicks, previousDay.clicks), leads: calculateChange(performance.leads, previousDay.leads) } : null;

  return `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Denní report - ${date}</title>
<style>body{font-family:-apple-system,sans-serif;max-width:700px;margin:0 auto;padding:20px;background:#f5f5f5}.container{background:#fff;border-radius:8px;padding:30px;box-shadow:0 2px 4px rgba(0,0,0,.1)}.header{text-align:center;border-bottom:2px solid #4F46E5;padding-bottom:20px;margin-bottom:20px}.header h1{margin:0;color:#4F46E5}.section{margin:25px 0}.section h2{font-size:18px;color:#4F46E5;border-bottom:1px solid #eee;padding-bottom:10px}.budget-bar{background:#e9ecef;border-radius:10px;height:20px;overflow:hidden;margin:10px 0}.budget-fill{background:linear-gradient(90deg,#10B981,#4F46E5);height:100%;border-radius:10px}.stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.stat-card{background:#f8f9fa;border-radius:8px;padding:15px;text-align:center}.stat-value{font-size:24px;font-weight:bold}.stat-label{font-size:12px;color:#666;text-transform:uppercase}.change-up{color:#10B981}.change-down{color:#EF4444}.goal-item{display:flex;align-items:center;margin:10px 0;padding:10px;background:#f8f9fa;border-radius:6px}.goal-bar{width:100px;height:8px;background:#e9ecef;border-radius:4px;overflow:hidden;margin-left:10px}.goal-fill.on-track{background:#10B981}.goal-fill.behind{background:#F59E0B}.ai-summary{background:#E0E7FF;border-left:4px solid #4F46E5;padding:15px;margin:20px 0}.footer{margin-top:30px;padding-top:20px;border-top:1px solid #eee;font-size:12px;color:#666;text-align:center}</style>
</head><body><div class="container"><div class="header"><h1>📊 Denní report</h1><p>${agentName} | ${date}</p></div>
<div class="section"><h2>💰 Rozpočet</h2><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span>Utraceno: ${formatNumber(budget.spent)} Kč</span><span>Zbývá: ${formatNumber(budget.remaining)} Kč</span></div><div class="budget-bar"><div class="budget-fill" style="width:${Math.min(budget.percentUsed,100)}%"></div></div><div style="display:flex;justify-content:space-between;font-size:14px;color:#666"><span>Měsíční rozpočet: ${formatNumber(budget.total)} Kč</span><span>${budget.percentUsed}% využito</span></div><p style="margin-top:10px">📅 Dnešní útrata: <strong>${formatNumber(budget.dailySpend)} Kč</strong></p></div>
<div class="section"><h2>📈 Dnešní výkon</h2><div class="stats-grid"><div class="stat-card"><div class="stat-value">${formatNumber(performance.impressions)}</div><div class="stat-label">Zobrazení</div>${changes ? `<div class="${changes.impressions >= 0 ? 'change-up' : 'change-down'}">${changes.impressions >= 0 ? '↑' : '↓'} ${Math.abs(changes.impressions).toFixed(1)}%</div>` : ''}</div><div class="stat-card"><div class="stat-value">${formatNumber(performance.reach)}</div><div class="stat-label">Dosah</div></div><div class="stat-card"><div class="stat-value">${formatNumber(performance.clicks)}</div><div class="stat-label">Kliknutí</div></div><div class="stat-card"><div class="stat-value">${performance.ctr.toFixed(2)}%</div><div class="stat-label">CTR</div></div><div class="stat-card"><div class="stat-value">${performance.leads}</div><div class="stat-label">Leads</div></div><div class="stat-card"><div class="stat-value">${performance.conversions}</div><div class="stat-label">Konverze</div></div></div></div>
<div class="section"><h2>🎯 Plnění cílů</h2>${goals.map(goal => `<div class="goal-item"><div style="flex:1"><div style="font-weight:bold">${getGoalTypeName(goal.type)}</div><div style="font-size:14px;color:#666">${goal.current}/${goal.target}</div></div><div class="goal-bar"><div class="goal-fill ${goal.onTrack ? 'on-track' : 'behind'}" style="width:${Math.min(goal.progress,100)}%"></div></div><span style="margin-left:10px;font-weight:bold">${goal.progress}%</span></div>`).join('')}</div>
${actions.length > 0 ? `<div class="section"><h2>✅ Dnešní akce</h2><ul style="list-style:none;padding:0">${actions.map(a => `<li style="display:flex;padding:10px;border-bottom:1px solid #eee"><span style="width:60px;font-size:14px;color:#666">${a.time}</span><span style="flex:1">${a.description}</span><span>${a.status === 'success' ? '✅' : a.status === 'failed' ? '❌' : '⏳'}</span></li>`).join('')}</ul></div>` : ''}
<div class="section"><h2>🤖 AI Shrnutí</h2><div class="ai-summary">${aiSummary}</div></div>
${recommendations.length > 0 ? `<div class="section"><h2>💡 Doporučení</h2><ul>${recommendations.map(r => `<li>${r}</li>`).join('')}</ul></div>` : ''}
<div class="footer"><p>Automaticky vygenerováno systémem ${agentName}.</p></div></div></body></html>`;
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatNumber(num: number): string { return num.toLocaleString('cs-CZ'); }

function getGoalTypeName(type: string): string {
  const names: Record<string, string> = { leads: 'Leads', reach: 'Dosah', engagement: 'Engagement', followers: 'Sledující', conversions: 'Konverze' };
  return names[type] || type;
}

export function generateWeeklyReportEmail(data: DailyReportData & { weekNumber: number; weeklyTotals: { impressions: number; reach: number; clicks: number; leads: number; spent: number; }; }): string {
  return generateDailyReportEmail({ ...data, date: `Týden ${data.weekNumber}`, performance: { ...data.performance, impressions: data.weeklyTotals.impressions, reach: data.weeklyTotals.reach, clicks: data.weeklyTotals.clicks, leads: data.weeklyTotals.leads } });
}
