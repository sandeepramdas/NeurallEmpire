import { BaseAgent, AgentExecutionResult } from './index';
import { AgentType } from '@prisma/client';

export class SalesAgent extends BaseAgent {
  async execute(input?: any): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`[Sales] Starting execution`);

      const pipeline = this.config.configuration?.pipeline || {};
      const outreach = this.config.configuration?.outreach || {};

      await this.simulateApiCall(1500);

      const leads = input?.leads || this.generateDefaultLeads();
      const outreachResults = this.performOutreach(leads, outreach);
      const pipelineUpdate = this.updatePipeline(outreachResults, pipeline);
      const metrics = this.generateMetrics(startTime, leads.length);

      const output = {
        leadsContacted: outreachResults.contacted,
        meetings: outreachResults.meetings,
        revenue: pipelineUpdate.revenue,
        pipelineStage: pipelineUpdate.stages,
        sharedData: {
          dealsCreated: outreachResults.meetings,
          revenue: pipelineUpdate.revenue,
        },
      };

      return this.createSuccessResult(output, metrics);
    } catch (error) {
      const metrics = this.generateMetrics(startTime, 0);
      return this.createErrorResult('Sales execution failed', metrics);
    }
  }

  private generateDefaultLeads() {
    return Array.from({ length: Math.floor(Math.random() * 15) + 5 }, (_, i) => ({
      id: `lead_${i}`,
      score: Math.floor(Math.random() * 100),
      company: `Company ${i}`,
    }));
  }

  private performOutreach(leads: any[], outreach: any) {
    const contacted = Math.floor(leads.length * 0.8);
    const meetings = Math.floor(contacted * 0.3);

    return { contacted, meetings, channels: outreach.channels || ['email'] };
  }

  private updatePipeline(outreach: any, pipeline: any) {
    return {
      revenue: Math.floor(Math.random() * 50000) + 10000,
      stages: { qualified: outreach.meetings, proposal: Math.floor(outreach.meetings * 0.6) },
    };
  }
}