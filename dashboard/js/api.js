/**
 * API Client for Dashboard
 */

const API = {
  baseUrl: '/api',

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add basic auth if credentials are stored
    const credentials = localStorage.getItem('apiCredentials');
    if (credentials) {
      defaultOptions.headers['Authorization'] = `Basic ${credentials}`;
    }

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });

      if (response.status === 401) {
        // Handle authentication
        this.promptLogin();
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * Prompt for login credentials
   */
  promptLogin() {
    const user = prompt('Uživatelské jméno:');
    const pass = prompt('Heslo:');

    if (user && pass) {
      const credentials = btoa(`${user}:${pass}`);
      localStorage.setItem('apiCredentials', credentials);
      location.reload();
    }
  },

  // Dashboard
  async getDashboard() {
    return this.request('/dashboard');
  },

  async getStats() {
    return this.request('/dashboard/stats');
  },

  async getChartData(type, days = 7) {
    return this.request(`/dashboard/chart/${type}?days=${days}`);
  },

  // Approvals
  async getApprovals() {
    return this.request('/approvals');
  },

  // Goals
  async getGoals() {
    return this.request('/goals');
  },

  async createGoal(data) {
    return this.request('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateGoal(id, data) {
    return this.request(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteGoal(id) {
    return this.request(`/goals/${id}`, {
      method: 'DELETE',
    });
  },

  // Chat
  async getChatHistory(limit = 50) {
    return this.request(`/chat/history?limit=${limit}`);
  },

  async sendMessage(message) {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  async clearChatHistory() {
    return this.request('/chat/history', {
      method: 'DELETE',
    });
  },

  // Settings
  async getSettings() {
    return this.request('/settings');
  },

  async updateSettings(data) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Logs
  async getLogs(limit = 50) {
    return this.request(`/logs?limit=${limit}`);
  },

  // Agent
  async getAgentStatus() {
    return this.request('/agent/status');
  },

  // Health
  async checkHealth() {
    return this.request('/health');
  },
};

// Make API available globally
window.API = API;
