import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface DashboardStats {
  overview: {
    totalAgents: number;
    activeAgents: number;
    totalWorkflows: number;
    totalUsers: number;
  };
  usage: {
    agentExecutionsToday: number;
    agentExecutionsThisMonth: number;
    apiCallsToday: number;
    totalTokensUsed: number;
  };
  performance: {
    avgAgentResponseTime: number;
    avgSuccessRate: number;
    totalCostThisMonth: number;
  };
  growth: {
    agentsGrowth: number;
    usersGrowth: number;
    executionsGrowth: number;
  };
}

export interface ChartData {
  agentExecutionsTrend: Array<{ date: string; count: number }>;
  agentPerformance: Array<{ name: string; successRate: number; runs: number }>;
  modelUsage: Array<{ model: string; count: number; percentage: number }>;
  hourlyActivity: Array<{ hour: string; executions: number }>;
}

export interface RecentActivity {
  type: 'agent_created' | 'agent_executed' | 'workflow_executed' | 'user_joined';
  message: string;
  timestamp: string;
  userId?: string;
  agentId?: string;
}

class DashboardService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  }

  /**
   * Get chart data
   */
  async getChartData(days: number = 7): Promise<ChartData> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/dashboard/charts?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/dashboard/activity?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  }
}

export const dashboardService = new DashboardService();
