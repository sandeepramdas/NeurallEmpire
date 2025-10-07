/**
 * Vector Store & RAG Service
 * Handles AI embeddings, semantic search, and knowledge retrieval
 * Enables context-aware AI agent responses
 */

import { prisma } from '@/server';
import { config } from '@/config/env';

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface CreateKnowledgeDTO {
  organizationId: string;
  content: string;
  type: 'document' | 'code' | 'conversation' | 'entity' | 'custom';
  metadata?: Record<string, any>;
  source?: string;
  tags?: string[];
  createdBy: string;
}

export interface SearchKnowledgeDTO {
  organizationId: string;
  query: string;
  type?: string;
  limit?: number;
  minSimilarity?: number;
}

/**
 * Generate embedding vector for text
 * Uses OpenAI embeddings API (can be swapped with other providers)
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<number[]> {
  // Check if OpenAI API key is configured
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OpenAI API key not configured. Using mock embedding.');
    // Return mock embedding (1536 dimensions for text-embedding-ada-002)
    return Array(1536).fill(0).map(() => Math.random());
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: options.model || 'text-embedding-3-small',
        dimensions: options.dimensions
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Fallback to mock embedding
    return Array(1536).fill(0).map(() => Math.random());
  }
}

/**
 * Create knowledge base entry with embedding
 */
export async function createKnowledge(dto: CreateKnowledgeDTO) {
  // Generate embedding for content
  const embedding = await generateEmbedding(dto.content);

  // Store in knowledge base
  // Note: We need to create a KnowledgeBase model in Prisma first
  // For now, we'll use raw SQL to insert into a hypothetical table
  const result = await prisma.$executeRaw`
    INSERT INTO "KnowledgeBase" (
      id, "organizationId", content, type, embedding, metadata, source, tags, "createdBy", "createdAt"
    ) VALUES (
      gen_random_uuid(),
      ${dto.organizationId},
      ${dto.content},
      ${dto.type},
      ${embedding}::vector,
      ${JSON.stringify(dto.metadata || {})}::jsonb,
      ${dto.source || null},
      ${dto.tags || []}::text[],
      ${dto.createdBy},
      NOW()
    )
    RETURNING id
  `;

  return result;
}

/**
 * Semantic search using vector similarity
 */
export async function searchKnowledge(dto: SearchKnowledgeDTO) {
  const {
    organizationId,
    query,
    type,
    limit = 10,
    minSimilarity = 0.7
  } = dto;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Perform vector similarity search
  // Using cosine similarity: 1 - (embedding <=> query_embedding)
  const results = await prisma.$queryRaw<Array<{
    id: string;
    content: string;
    type: string;
    metadata: any;
    source: string;
    tags: string[];
    similarity: number;
    createdAt: Date;
  }>>`
    SELECT
      id,
      content,
      type,
      metadata,
      source,
      tags,
      1 - (embedding <=> ${queryEmbedding}::vector) as similarity,
      "createdAt"
    FROM "KnowledgeBase"
    WHERE "organizationId" = ${organizationId}
      AND "deletedAt" IS NULL
      ${type ? prisma.$queryRaw`AND type = ${type}` : prisma.$queryRaw``}
      AND 1 - (embedding <=> ${queryEmbedding}::vector) >= ${minSimilarity}
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Store conversation with embedding for context retrieval
 */
export async function storeConversation(
  organizationId: string,
  agentId: string,
  userId: string,
  userMessage: string,
  agentResponse: string,
  metadata?: Record<string, any>
) {
  // Create combined text for embedding
  const combinedText = `User: ${userMessage}\nAgent: ${agentResponse}`;
  const embedding = await generateEmbedding(combinedText);

  // Store conversation with embedding
  await prisma.$executeRaw`
    INSERT INTO "ConversationHistory" (
      id, "organizationId", "agentId", "userId", "userMessage", "agentResponse",
      embedding, metadata, "createdAt"
    ) VALUES (
      gen_random_uuid(),
      ${organizationId},
      ${agentId},
      ${userId},
      ${userMessage},
      ${agentResponse},
      ${embedding}::vector,
      ${JSON.stringify(metadata || {})}::jsonb,
      NOW()
    )
  `;
}

/**
 * Get relevant conversation history for context
 */
export async function getRelevantConversations(
  organizationId: string,
  agentId: string,
  query: string,
  limit: number = 5
) {
  const queryEmbedding = await generateEmbedding(query);

  const results = await prisma.$queryRaw<Array<{
    id: string;
    userMessage: string;
    agentResponse: string;
    metadata: any;
    similarity: number;
    createdAt: Date;
  }>>`
    SELECT
      id,
      "userMessage",
      "agentResponse",
      metadata,
      1 - (embedding <=> ${queryEmbedding}::vector) as similarity,
      "createdAt"
    FROM "ConversationHistory"
    WHERE "organizationId" = ${organizationId}
      AND "agentId" = ${agentId}
      AND "deletedAt" IS NULL
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Store code snippet with embedding for AI code generation
 */
export async function storeCodeSnippet(
  organizationId: string,
  code: string,
  language: string,
  description: string,
  tags: string[],
  createdBy: string
) {
  // Create text for embedding (description + code)
  const text = `${description}\n\`\`\`${language}\n${code}\n\`\`\``;
  const embedding = await generateEmbedding(text);

  await prisma.$executeRaw`
    INSERT INTO "CodeSnippets" (
      id, "organizationId", code, language, description, tags,
      embedding, "createdBy", "createdAt"
    ) VALUES (
      gen_random_uuid(),
      ${organizationId},
      ${code},
      ${language},
      ${description},
      ${tags}::text[],
      ${embedding}::vector,
      ${createdBy},
      NOW()
    )
  `;
}

/**
 * Search for relevant code snippets
 */
export async function searchCodeSnippets(
  organizationId: string,
  query: string,
  language?: string,
  limit: number = 10
) {
  const queryEmbedding = await generateEmbedding(query);

  const results = await prisma.$queryRaw<Array<{
    id: string;
    code: string;
    language: string;
    description: string;
    tags: string[];
    similarity: number;
  }>>`
    SELECT
      id,
      code,
      language,
      description,
      tags,
      1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM "CodeSnippets"
    WHERE "organizationId" = ${organizationId}
      AND "deletedAt" IS NULL
      ${language ? prisma.$queryRaw`AND language = ${language}` : prisma.$queryRaw``}
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Build RAG context for AI agent from multiple sources
 */
export async function buildRAGContext(
  organizationId: string,
  agentId: string,
  userId: string,
  query: string
) {
  // Get relevant knowledge from multiple sources
  const [knowledge, conversations, codeSnippets] = await Promise.all([
    searchKnowledge({ organizationId, query, limit: 5, minSimilarity: 0.75 }),
    getRelevantConversations(organizationId, agentId, query, 3),
    searchCodeSnippets(organizationId, query, undefined, 3)
  ]);

  // Build context string
  let context = '';

  if (knowledge.length > 0) {
    context += '## Relevant Knowledge:\n';
    knowledge.forEach((k, i) => {
      context += `${i + 1}. [${k.type}] ${k.content.substring(0, 200)}...\n`;
    });
    context += '\n';
  }

  if (conversations.length > 0) {
    context += '## Previous Conversations:\n';
    conversations.forEach((c, i) => {
      context += `${i + 1}. User: ${c.userMessage}\n   Agent: ${c.agentResponse}\n`;
    });
    context += '\n';
  }

  if (codeSnippets.length > 0) {
    context += '## Relevant Code Examples:\n';
    codeSnippets.forEach((s, i) => {
      context += `${i + 1}. [${s.language}] ${s.description}\n\`\`\`${s.language}\n${s.code}\n\`\`\`\n`;
    });
  }

  return {
    context,
    sources: {
      knowledge,
      conversations,
      codeSnippets
    }
  };
}

/**
 * Calculate similarity between two text strings
 */
export async function calculateSimilarity(text1: string, text2: string): Promise<number> {
  const [embedding1, embedding2] = await Promise.all([
    generateEmbedding(text1),
    generateEmbedding(text2)
  ]);

  // Calculate cosine similarity
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export const VectorService = {
  generateEmbedding,
  createKnowledge,
  searchKnowledge,
  storeConversation,
  getRelevantConversations,
  storeCodeSnippet,
  searchCodeSnippets,
  buildRAGContext,
  calculateSimilarity
};
