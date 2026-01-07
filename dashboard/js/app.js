/**
 * Dashboard Application
 */

// State
let dashboardData = null;
let performanceChart = null;
let pendingActionsData = [];
let currentPreviewIndex = null;

/**
 * Initialize the dashboard
 */
async function init() {
  console.log('Initializing dashboard...');

  try {
    // Load dashboard data
    await loadDashboard();

    // Initialize chart
    initChart();

    // Set up auto-refresh
    setInterval(loadDashboard, 60000); // Refresh every minute
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
    showError('Nepodařilo se načíst dashboard');
  }
}

/**
 * Load dashboard data
 */
async function loadDashboard() {
  try {
    dashboardData = await API.getDashboard();
    updateUI();
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

/**
 * Update UI with dashboard data
 */
function updateUI() {
  if (!dashboardData) return;

  // Agent status
  const statusEl = document.getElementById('agent-status');
  const nameEl = document.getElementById('agent-name');

  if (dashboardData.agent) {
    statusEl.textContent = dashboardData.agent.status === 'active' ? 'Aktivní' : 'Neaktivní';
    statusEl.className = `status-badge status-${dashboardData.agent.status === 'active' ? 'active' : 'error'}`;
    nameEl.textContent = dashboardData.agent.name;
  }

  // Budget
  if (dashboardData.budget) {
    const budget = dashboardData.budget;
    document.getElementById('budget-remaining').textContent = formatCurrency(budget.monthlyRemaining);
    document.getElementById('budget-total').textContent = formatCurrency(budget.monthlyBudget);
    document.getElementById('budget-progress').style.width = `${budget.monthlyPercentUsed}%`;
  }

  // KPIs (placeholder - would come from FB insights)
  document.getElementById('reach-value').textContent = formatNumber(0);
  document.getElementById('leads-value').textContent = '0';
  document.getElementById('leads-goal').textContent = '/ 0 cíl';
  document.getElementById('ctr-value').textContent = '0%';
  document.getElementById('ctr-trend').textContent = '-';

  // Goals
  updateGoals(dashboardData.goals || []);

  // Pending actions
  updatePendingActions(dashboardData.pendingActions || []);

  // Recent actions
  updateRecentActions(dashboardData.recentActions || []);
}

/**
 * Update goals list
 */
function updateGoals(goals) {
  const container = document.getElementById('goals-list');

  if (goals.length === 0) {
    container.innerHTML = '<p class="empty-state">Žádné cíle nejsou definovány</p>';
    return;
  }

  container.innerHTML = goals.map(goal => `
    <div class="goal-item">
      <div class="goal-info">
        <div class="goal-name">${getGoalTypeName(goal.type)}</div>
        <div class="goal-progress-text">${goal.current} / ${goal.target} (${goal.period})</div>
      </div>
      <div class="goal-bar">
        <div class="goal-fill ${goal.onTrack ? 'on-track' : 'behind'}" style="width: ${Math.min(goal.progress, 100)}%"></div>
      </div>
      <span class="goal-percent">${goal.progress}%</span>
    </div>
  `).join('');
}

/**
 * Update pending actions list
 */
function updatePendingActions(actions) {
  const container = document.getElementById('pending-list');
  const countEl = document.getElementById('pending-count');

  // Store for preview
  pendingActionsData = actions;

  countEl.textContent = actions.length;

  if (actions.length === 0) {
    container.innerHTML = '<p class="empty-state">Žádné čekající akce</p>';
    return;
  }

  container.innerHTML = actions.map((action, index) => `
    <div class="action-item" id="action-${index}">
      <div class="action-type">${action.typeName}</div>
      <div class="action-time">vyprší ${formatTime(action.expiresAt)}</div>
      <div class="action-buttons">
        <button onclick="showPreview(${index})" class="btn btn-preview" title="Náhled">👁️</button>
        <button onclick="approveAction('${action.token}', ${index})" class="btn btn-success" title="Schválit">✓</button>
        <button onclick="rejectAction('${action.token}', ${index})" class="btn btn-danger" title="Zamítnout">✗</button>
      </div>
    </div>
  `).join('');
}

/**
 * Update recent actions list
 */
function updateRecentActions(actions) {
  const container = document.getElementById('recent-list');

  if (actions.length === 0) {
    container.innerHTML = '<p class="empty-state">Žádné nedávné akce</p>';
    return;
  }

  container.innerHTML = actions.map(action => `
    <div class="action-item">
      <span class="action-status">${getStatusIcon(action.status)}</span>
      <div class="action-type">${action.typeName}</div>
      <div class="action-time">${formatTime(action.createdAt)}</div>
    </div>
  `).join('');
}

/**
 * Initialize performance chart
 */
function initChart() {
  const ctx = document.getElementById('performance-chart');
  if (!ctx) return;

  performanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: getLast7Days(),
      datasets: [
        {
          label: 'Zobrazení',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Kliknutí',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

/**
 * Helper: Format currency
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Helper: Format number
 */
function formatNumber(value) {
  return new Intl.NumberFormat('cs-CZ').format(value);
}

/**
 * Helper: Format time
 */
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Helper: Get last 7 days labels
 */
function getLast7Days() {
  const days = [];
  const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(dayNames[date.getDay()]);
  }

  return days;
}

/**
 * Helper: Get goal type name
 */
function getGoalTypeName(type) {
  const names = {
    leads: 'Leads',
    reach: 'Dosah',
    engagement: 'Engagement',
    followers: 'Sledující',
    conversions: 'Konverze',
  };
  return names[type] || type;
}

/**
 * Helper: Get status icon
 */
function getStatusIcon(status) {
  const icons = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
    executed: '✅',
    failed: '❌',
    expired: '⌛',
  };
  return icons[status] || '❓';
}

/**
 * Show error message
 */
function showError(message) {
  const container = document.querySelector('.main');
  if (container) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 3rem;">
        <h2>❌ Chyba</h2>
        <p>${message}</p>
        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">Zkusit znovu</button>
      </div>
    `;
  }
}

/**
 * Approve action via API
 */
async function approveAction(token, index) {
  const actionEl = document.getElementById(`action-${index}`);
  const buttons = actionEl?.querySelectorAll('button');

  // Disable buttons while processing
  buttons?.forEach(btn => btn.disabled = true);

  try {
    const response = await fetch(`/webhook/approve/${token}`);
    const html = await response.text();

    // Check if success
    if (response.ok && html.includes('schválena')) {
      // Show success in place
      if (actionEl) {
        actionEl.innerHTML = `
          <div class="action-type" style="color: var(--success);">✅ Schváleno a provedeno</div>
        `;
        // Remove after 3 seconds and reload
        setTimeout(() => {
          loadDashboard();
        }, 2000);
      }
    } else {
      // Extract error message
      const match = html.match(/<div class="message">\s*([\s\S]*?)\s*<\/div>/);
      const message = match ? match[1].replace(/<[^>]*>/g, '').trim() : 'Neznámá chyba';
      alert(`Chyba: ${message}`);
      buttons?.forEach(btn => btn.disabled = false);
    }
  } catch (error) {
    console.error('Approve error:', error);
    alert('Chyba při schvalování: ' + error.message);
    buttons?.forEach(btn => btn.disabled = false);
  }
}

/**
 * Reject action via API
 */
async function rejectAction(token, index) {
  if (!confirm('Opravdu chcete tuto akci zamítnout?')) {
    return;
  }

  const actionEl = document.getElementById(`action-${index}`);
  const buttons = actionEl?.querySelectorAll('button');

  // Disable buttons while processing
  buttons?.forEach(btn => btn.disabled = true);

  try {
    const response = await fetch(`/webhook/reject/${token}`);

    if (response.ok) {
      // Show rejection in place
      if (actionEl) {
        actionEl.innerHTML = `
          <div class="action-type" style="color: var(--danger);">❌ Zamítnuto</div>
        `;
        // Remove after 2 seconds and reload
        setTimeout(() => {
          loadDashboard();
        }, 2000);
      }
    } else {
      alert('Chyba při zamítání akce');
      buttons?.forEach(btn => btn.disabled = false);
    }
  } catch (error) {
    console.error('Reject error:', error);
    alert('Chyba při zamítání: ' + error.message);
    buttons?.forEach(btn => btn.disabled = false);
  }
}

/**
 * Show preview modal for an action
 */
function showPreview(index) {
  console.log('showPreview called with index:', index);
  console.log('pendingActionsData:', pendingActionsData);

  const action = pendingActionsData[index];
  if (!action) {
    console.error('No action found at index:', index);
    alert('Chyba: Akce nenalezena. Zkuste obnovit stránku.');
    return;
  }

  const modal = document.getElementById('preview-modal');
  if (!modal) {
    console.error('Modal element not found!');
    alert('Chyba: Modal nenalezen.');
    return;
  }

  const titleEl = document.getElementById('modal-title');
  const contentEl = document.getElementById('preview-content');
  const reasoningEl = document.getElementById('preview-reasoning');
  const impactEl = document.getElementById('preview-impact');
  const confidenceEl = document.getElementById('preview-confidence');
  const approveBtn = document.getElementById('preview-approve');
  const rejectBtn = document.getElementById('preview-reject');

  console.log('Opening modal for action:', action.typeName);

  // Store current index for approve/reject from preview
  currentPreviewIndex = index;

  // Set title
  titleEl.textContent = `Náhled: ${action.typeName}`;

  // Set content based on action type
  if (action.type === 'create_post' && action.payload?.content) {
    contentEl.textContent = action.payload.content;
  } else if (action.payload) {
    contentEl.textContent = JSON.stringify(action.payload, null, 2);
  } else {
    contentEl.textContent = 'Náhled není k dispozici';
  }

  // Set reasoning and impact
  reasoningEl.textContent = action.reasoning || '-';
  impactEl.textContent = action.expectedImpact || '-';

  // Set confidence badge
  const confidenceText = {
    high: 'Vysoká',
    medium: 'Střední',
    low: 'Nízká'
  };
  confidenceEl.textContent = confidenceText[action.confidence] || action.confidence;
  confidenceEl.className = `confidence-badge confidence-${action.confidence}`;

  // Set action URLs
  approveBtn.href = `/webhook/approve/${action.token}`;
  rejectBtn.href = `/webhook/reject/${action.token}`;

  // Show modal
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/**
 * Close preview modal
 */
function closePreview() {
  const modal = document.getElementById('preview-modal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  currentPreviewIndex = null;
}

/**
 * Approve action from preview modal
 */
async function approveFromPreview() {
  if (currentPreviewIndex === null) return;

  const action = pendingActionsData[currentPreviewIndex];
  if (!action) return;

  closePreview();
  await approveAction(action.token, currentPreviewIndex);
}

/**
 * Reject action from preview modal
 */
async function rejectFromPreview() {
  if (currentPreviewIndex === null) return;

  const action = pendingActionsData[currentPreviewIndex];
  if (!action) return;

  closePreview();
  await rejectAction(action.token, currentPreviewIndex);
}

/**
 * Close modal on Escape key
 */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePreview();
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
