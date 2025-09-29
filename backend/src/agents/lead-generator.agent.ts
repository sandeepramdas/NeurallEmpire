import { BaseAgent, AgentExecutionResult } from './index';
import { AgentType } from '@prisma/client';

export class LeadGeneratorAgent extends BaseAgent {
  async execute(input?: any): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`[Lead Generator] Starting execution with config:`, this.config);

      // Simulate API calls to various lead sources
      const sources = this.config.configuration?.sources || ['website', 'social_media', 'linkedin'];
      const targetCriteria = this.config.configuration?.targetCriteria || {};
      const leadQualification = this.config.configuration?.leadQualification || { minimumScore: 50 };
      const dailyLimit = this.config.configuration?.dailyLimit || 100;

      // Simulate lead generation process
      await this.simulateApiCall(1500); // LinkedIn API
      await this.simulateApiCall(1200); // Website scraping
      await this.simulateApiCall(800);  // Social media APIs

      // Generate realistic lead data
      const leads = this.generateLeads(sources, targetCriteria, dailyLimit);
      const qualifiedLeads = this.qualifyLeads(leads, leadQualification);

      const metrics = this.generateMetrics(startTime, 3);

      // Update lead counts in database (simulated)
      const output = {
        totalLeads: leads.length,
        qualifiedLeads: qualifiedLeads.length,
        qualificationRate: qualifiedLeads.length / leads.length,
        sources: sources,
        leads: qualifiedLeads.slice(0, 10), // Return top 10 for preview
        targetCriteria,
        execution: {
          timestamp: new Date().toISOString(),
          agentId: this.id,
          processingTime: metrics.duration,
        },
        sharedData: {
          leadCount: qualifiedLeads.length,
          avgLeadScore: qualifiedLeads.reduce((acc, lead) => acc + lead.score, 0) / qualifiedLeads.length,
        },
      };

      console.log(`[Lead Generator] Generated ${leads.length} leads, ${qualifiedLeads.length} qualified`);
      return this.createSuccessResult(output, metrics);

    } catch (error) {
      console.error(`[Lead Generator] Execution failed:`, error);
      const metrics = this.generateMetrics(startTime, 0);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Lead generation failed',
        metrics
      );
    }
  }

  private generateLeads(sources: string[], targetCriteria: any, limit: number) {
    const leads = [];
    const industries = targetCriteria.industries || ['Technology', 'Healthcare', 'Finance', 'E-commerce'];
    const jobTitles = targetCriteria.jobTitles || ['CEO', 'CTO', 'Marketing Director', 'VP Sales'];

    for (let i = 0; i < Math.min(limit, Math.floor(Math.random() * 50) + 20); i++) {
      const lead = {
        id: `lead_${Date.now()}_${i}`,
        email: this.generateEmail(),
        firstName: this.getRandomName(),
        lastName: this.getRandomSurname(),
        company: this.getRandomCompany(),
        jobTitle: jobTitles[Math.floor(Math.random() * jobTitles.length)],
        industry: industries[Math.floor(Math.random() * industries.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        phone: this.generatePhone(),
        score: Math.floor(Math.random() * 100),
        location: this.getRandomLocation(),
        companySize: this.getRandomCompanySize(),
        estimatedRevenue: Math.floor(Math.random() * 10000000) + 100000,
        socialProfiles: {
          linkedin: `https://linkedin.com/in/${this.generateUsername()}`,
          twitter: `https://twitter.com/${this.generateUsername()}`,
        },
        metadata: {
          foundAt: new Date().toISOString(),
          confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
          lastActive: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };
      leads.push(lead);
    }

    return leads;
  }

  private qualifyLeads(leads: any[], qualification: any) {
    const minimumScore = qualification.minimumScore || 50;
    const scoringCriteria = qualification.scoringCriteria || ['revenue', 'size', 'industry'];

    return leads
      .map(lead => {
        // Enhance scoring based on criteria
        let bonusScore = 0;

        if (scoringCriteria.includes('revenue') && lead.estimatedRevenue > 1000000) {
          bonusScore += 15;
        }

        if (scoringCriteria.includes('size') && ['medium', 'large', 'enterprise'].includes(lead.companySize)) {
          bonusScore += 10;
        }

        if (scoringCriteria.includes('industry') && ['Technology', 'Finance'].includes(lead.industry)) {
          bonusScore += 12;
        }

        lead.score = Math.min(100, lead.score + bonusScore);
        return lead;
      })
      .filter(lead => lead.score >= minimumScore)
      .sort((a, b) => b.score - a.score);
  }

  private generateEmail(): string {
    const domains = ['gmail.com', 'company.com', 'business.org', 'enterprise.net'];
    const username = this.generateUsername();
    return `${username}@${domains[Math.floor(Math.random() * domains.length)]}`;
  }

  private generateUsername(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private generatePhone(): string {
    return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  private getRandomName(): string {
    const names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'];
    return names[Math.floor(Math.random() * names.length)]!;
  }

  private getRandomSurname(): string {
    const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    return surnames[Math.floor(Math.random() * surnames.length)]!;
  }

  private getRandomCompany(): string {
    const companies = [
      'TechCorp Inc', 'Innovate Solutions', 'Digital Dynamics', 'Future Systems',
      'Alpha Industries', 'Beta Technologies', 'Gamma Enterprises', 'Delta Innovations',
      'Quantum Labs', 'Synergy Group', 'Nexus Corporation', 'Apex Ventures'
    ];
    return companies[Math.floor(Math.random() * companies.length)]!;
  }

  private getRandomLocation(): string {
    const locations = [
      'New York, NY', 'San Francisco, CA', 'Chicago, IL', 'Austin, TX',
      'Seattle, WA', 'Boston, MA', 'Denver, CO', 'Atlanta, GA'
    ];
    return locations[Math.floor(Math.random() * locations.length)]!;
  }

  private getRandomCompanySize(): string {
    const sizes = ['startup', 'small', 'medium', 'large', 'enterprise'];
    return sizes[Math.floor(Math.random() * sizes.length)]!;
  }
}