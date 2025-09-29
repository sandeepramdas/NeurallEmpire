import { BaseAgent, AgentExecutionResult } from './index';
import { AgentType } from '@prisma/client';

export class CustomerServiceAgent extends BaseAgent {
  async execute(input?: any): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`[Customer Service] Starting execution`);

      const channels = this.config.configuration?.channels || ['email', 'chat'];
      const responses = this.config.configuration?.responses || {};

      await this.simulateApiCall(800);

      const tickets = this.processTickets(channels, responses);
      const satisfaction = this.calculateSatisfaction(tickets);
      const metrics = this.generateMetrics(startTime, tickets.length);

      const output = {
        ticketsProcessed: tickets.length,
        avgResponseTime: Math.floor(Math.random() * 30) + 15,
        satisfaction: satisfaction,
        channels,
        sharedData: {
          ticketsResolved: tickets.filter((t: any) => t.resolved).length,
          satisfactionScore: satisfaction,
        },
      };

      return this.createSuccessResult(output, metrics);
    } catch (error) {
      const metrics = this.generateMetrics(startTime, 0);
      return this.createErrorResult('Customer service failed', metrics);
    }
  }

  private processTickets(channels: string[], responses: any) {
    const count = Math.floor(Math.random() * 20) + 5;
    return Array.from({ length: count }, (_, i) => ({
      id: `ticket_${i}`,
      channel: channels[Math.floor(Math.random() * channels.length)],
      resolved: Math.random() > 0.1,
      responseTime: Math.floor(Math.random() * 60) + 5,
    }));
  }

  private calculateSatisfaction(tickets: any[]) {
    return parseFloat((Math.random() * 2 + 8).toFixed(1)); // 8.0-10.0
  }
}