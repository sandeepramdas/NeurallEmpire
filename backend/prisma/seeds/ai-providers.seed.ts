import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed AI Model Providers
 * Populates the database with common AI providers like OpenAI, Anthropic, Google, etc.
 */
export async function seedAIProviders() {
  console.log('🤖 Seeding AI Model Providers...');

  const providers = [
    {
      code: 'openai',
      name: 'OpenAI',
      displayName: 'OpenAI GPT Models',
      apiBaseUrl: 'https://api.openai.com/v1',
      apiDocUrl: 'https://platform.openai.com/docs/api-reference',
      website: 'https://openai.com',
      icon: 'https://cdn.simpleicons.org/openai',
      color: '#412991',
      isActive: true,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      maxTokensLimit: 128000,
      orderIndex: 1,
      description: 'OpenAI provides state-of-the-art language models including GPT-4, GPT-4 Turbo, and GPT-3.5 Turbo',
    },
    {
      code: 'anthropic',
      name: 'Anthropic',
      displayName: 'Anthropic Claude',
      apiBaseUrl: 'https://api.anthropic.com/v1',
      apiDocUrl: 'https://docs.anthropic.com/en/api',
      website: 'https://anthropic.com',
      icon: 'https://cdn.simpleicons.org/anthropic',
      color: '#D4A574',
      isActive: true,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      maxTokensLimit: 200000,
      orderIndex: 2,
      description: 'Anthropic Claude models are designed for safe, helpful, and harmless AI assistance',
    },
    {
      code: 'google',
      name: 'Google',
      displayName: 'Google Gemini',
      apiBaseUrl: 'https://generativelanguage.googleapis.com/v1',
      apiDocUrl: 'https://ai.google.dev/docs',
      website: 'https://ai.google.dev',
      icon: 'https://cdn.simpleicons.org/google',
      color: '#4285F4',
      isActive: true,
      supportsStreaming: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      maxTokensLimit: 32000,
      orderIndex: 3,
      description: 'Google Gemini offers multimodal AI capabilities with vision and text understanding',
    },
    {
      code: 'mistral',
      name: 'Mistral AI',
      displayName: 'Mistral AI',
      apiBaseUrl: 'https://api.mistral.ai/v1',
      apiDocUrl: 'https://docs.mistral.ai',
      website: 'https://mistral.ai',
      icon: 'https://mistral.ai/images/logo_hubc88c4ece131b91c7cb753f40e9e1cc5_2589_256x0_resize_q97_h2_lanczos_3.webp',
      color: '#FF7000',
      isActive: true,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: true,
      maxTokensLimit: 32000,
      orderIndex: 4,
      description: 'Mistral AI provides efficient and powerful open-source language models',
    },
    {
      code: 'cohere',
      name: 'Cohere',
      displayName: 'Cohere',
      apiBaseUrl: 'https://api.cohere.ai/v1',
      apiDocUrl: 'https://docs.cohere.com',
      website: 'https://cohere.com',
      icon: 'https://cdn.simpleicons.org/cohere',
      color: '#39594D',
      isActive: true,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      maxTokensLimit: 4096,
      orderIndex: 5,
      description: 'Cohere specializes in enterprise-grade language AI with multilingual support',
    },
    {
      code: 'perplexity',
      name: 'Perplexity',
      displayName: 'Perplexity AI',
      apiBaseUrl: 'https://api.perplexity.ai',
      apiDocUrl: 'https://docs.perplexity.ai',
      website: 'https://perplexity.ai',
      icon: 'https://www.perplexity.ai/favicon.svg',
      color: '#1FB8CD',
      isActive: true,
      supportsStreaming: true,
      supportsVision: false,
      supportsFunctionCalling: false,
      maxTokensLimit: 4096,
      orderIndex: 6,
      description: 'Perplexity provides AI models optimized for search and information retrieval',
    },
  ];

  for (const provider of providers) {
    await prisma.aIModelProvider.upsert({
      where: { code: provider.code },
      update: provider,
      create: provider,
    });
    console.log(`  ✓ ${provider.name} (${provider.code})`);
  }

  console.log('✅ AI Model Providers seeded successfully!\n');
}

// Run if called directly
if (require.main === module) {
  seedAIProviders()
    .catch((error) => {
      console.error('❌ Error seeding AI providers:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
