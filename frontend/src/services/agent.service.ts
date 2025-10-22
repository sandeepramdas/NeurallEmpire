import { api } from './api';

export interface CreateAgentRequest {
  name: string;
  type: string;
  category: string;
  description?: string;
  config: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
  capabilities: string[];
  triggers?: Array<{
    type: string;
    conditions: any;
  }>;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  capabilities: string[];
  status: string;
  usageCount: number;
  successRate: number;
  avgResponseTime: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isPublic: boolean;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    interactions: number;
  };
}

export interface AgentMetrics {
  agent: {
    id: string;
    name: string;
    status: string;
  };
  metrics: any[];
  executions: Array<{
    status: string;
    _count: {
      id: number;
    };
  }>;
  summary: {
    usageCount: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface ExecuteAgentRequest {
  input: any;
}

export interface ExecuteAgentResponse {
  success: boolean;
  message: string;
  data: {
    executionId: string;
    status: string;
  };
}

class AgentService {
  /**
   * Get all agents for the organization
   */
  async getAgents(params?: {
    status?: string;
    type?: string;
    isPublic?: boolean;
  }): Promise<{ success: boolean; data: Agent[] }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.isPublic !== undefined) queryParams.append('isPublic', params.isPublic.toString());

    const response = await api.get<{ success: boolean; data: Agent[] }>(
      `/agents${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  }

  /**
   * Get a single agent by ID
   */
  async getAgent(id: string): Promise<{ success: boolean; data: Agent }> {
    const response = await api.get<{ success: boolean; data: Agent }>(`/agents/${id}`);
    return response.data;
  }

  /**
   * Create a new agent
   */
  async createAgent(data: CreateAgentRequest): Promise<{ success: boolean; message: string; data: Agent }> {
    const response = await api.post<{ success: boolean; message: string; data: Agent }>('/agents', data);
    return response.data;
  }

  /**
   * Update an existing agent
   */
  async updateAgent(
    id: string,
    data: Partial<CreateAgentRequest>
  ): Promise<{ success: boolean; message: string; data: Agent }> {
    const response = await api.put<{ success: boolean; message: string; data: Agent }>(`/agents/${id}`, data);
    return response.data;
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    id: string,
    status: string
  ): Promise<{ success: boolean; message: string; data: Agent }> {
    const response = await api.put<{ success: boolean; message: string; data: Agent }>(`/agents/${id}/status`, {
      status,
    });
    return response.data;
  }

  /**
   * Execute an agent
   */
  async executeAgent(id: string, input: any): Promise<ExecuteAgentResponse> {
    const response = await api.post<ExecuteAgentResponse>(`/agents/${id}/execute`, { input });
    return response.data;
  }

  /**
   * Get agent metrics
   */
  async getAgentMetrics(id: string, period?: string): Promise<{ success: boolean; data: AgentMetrics }> {
    const response = await api.get<{ success: boolean; data: AgentMetrics }>(
      `/agents/${id}/metrics${period ? `?period=${period}` : ''}`
    );
    return response.data;
  }

  /**
   * Delete an agent (soft delete)
   */
  async deleteAgent(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(`/agents/${id}`);
    return response.data;
  }

  /**
   * Clone an agent
   */
  async cloneAgent(id: string): Promise<{ success: boolean; message: string; data: Agent }> {
    const agent = await this.getAgent(id);

    const cloneData: CreateAgentRequest = {
      name: `${agent.data.name} (Copy)`,
      type: agent.data.type,
      category: agent.data.category,
      description: agent.data.description,
      config: {
        systemPrompt: agent.data.systemPrompt,
        temperature: agent.data.temperature,
        maxTokens: agent.data.maxTokens,
        model: agent.data.model,
      },
      capabilities: agent.data.capabilities,
    };

    return this.createAgent(cloneData);
  }
}

export const agentService = new AgentService();
export default agentService;
