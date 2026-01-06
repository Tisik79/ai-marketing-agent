/**
 * API Client for Dashboard
 */

const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: { 'Content-Type': 'application/json' },
    };
    const credentials = localStorage.getItem('apiCredentials');
    if (credentials) defaultOptions.headers['Authorization'] = `Basic ${credentials}`;

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      if (response.status === 401) { this.promptLogin(); throw new Error('Authentication required'); }
      if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'API request failed'); }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  promptLogin() {
    const user = prompt('U\u017eivatelsk\u00e9 jm\u00e9no:');
    const pass = prompt('Heslo:');
    if (user && pass) {
      localStorage.setItem('apiCredentials', btoa(`${user}:${pass}`));
      location.reload();
    }
  },

  async getDashboard() { return this.request('/dashboard'); },
  async getStats() { return this.request('/dashboard/stats'); },
  async getChartData(type, days = 7) { return this.request(`/dashboard/chart/${type}?days=${days}`); },
  async getApprovals() { return this.request('/approvals'); },
  async getGoals() { return this.request('/goals'); },
  async createGoal(data) { return this.request('/goals', { method: 'POST', body: JSON.stringify(data) }); },
  async updateGoal(id, data) { return this.request(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteGoal(id) { return this.request(`/goals/${id}`, { method: 'DELETE' }); },
  async getChatHistory(limit = 50) { return this.request(`/chat/history?limit=${limit}`); },
  async sendMessage(message) { return this.request('/chat', { method: 'POST', body: JSON.stringify({ message }) }); },
  async clearChatHistory() { return this.request('/chat/history', { method: 'DELETE' }); },
  async getSettings() { return this.request('/settings'); },
  async updateSettings(data) { return this.request('/settings', { method: 'PUT', body: JSON.stringify(data) }); },
  async getLogs(limit = 50) { return this.request(`/logs?limit=${limit}`); },
  async getAgentStatus() { return this.request('/agent/status'); },
  async checkHealth() { return this.request('/health'); },
};

window.API = API;
