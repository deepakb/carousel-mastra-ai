import { Memory } from '@mastra/memory';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { google } from '@ai-sdk/google';

/**
 * Enhanced carousel memory with vector search and improved templates
 * Configured for resource-scoped memory to persist across all user threads
 */
export const carouselMemory = new Memory({
  // Storage for conversation history
  storage: new LibSQLStore({
    url: "file:carousel-memory.db",
  }),

  // Vector store for semantic search
  vector: new LibSQLVector({
    connectionUrl: "file:carousel-memory.db",
  }),

  embedder: google.textEmbeddingModel('text-embedding-004'),

  options: {
    // Keep last 20 messages in conversation history
    lastMessages: 20,

    // Working memory for persistent user preferences
    workingMemory: {
      enabled: true,
      scope: 'resource', // Makes working memory persist across all threads for the same user
      template: `
# User Brand Profile

## Active Brand Kit
- **Brand Kit ID**: [ID]
- **Brand Name**: [NAME]
- **Niche**: [NICHE]
- **Colors**: [PRIMARY], [SECONDARY]
- **Typography**: [HEADLINE_FONT], [BODY_FONT]
- **Logo**: [LOGO_DESCRIPTION]
- **Visual Style**: [STYLE]

## Generation Preferences
- **Preferred Format**: [FORMAT]
- **Typical Slide Count**: [COUNT]
- **Default Tone**: [TONE]
- **Target Engagement**: [TARGET]
- **Content Structure**: [STRUCTURE]
- **Call-to-Action Style**: [CTA_STYLE]

## Recent Performance
- **Total Carousels**: [COUNT]
- **Average Score**: [SCORE]
- **Best Performing Format**: [FORMAT]
- **Engagement Metrics**: [METRICS]
- **Top Performing Topics**: [TOPICS]

## User Workflow Patterns
- **Creation Frequency**: [FREQUENCY]
- **Revision Patterns**: [REVISION_PATTERN]
- **Feedback History**: [FEEDBACK]
- **Common Edits**: [EDITS]

## Content Strategy
- **Target Audience**: [AUDIENCE]
- **Content Pillars**: [PILLARS]
- **Seasonal Themes**: [THEMES]
- **Competitor Analysis**: [COMPETITORS]
      `.trim(),
    },

    // Enhanced semantic recall for RAG-based brand kit retrieval
    semanticRecall: {
      topK: 5, // Increased number of similar messages to retrieve
      messageRange: {
        before: 2, // Messages to include before each result
        after: 1,  // Messages to include after each result
      },
      scope: 'resource', // Search across all threads for the same user
    },

    // Thread configuration
    threads: {
      generateTitle: true, // Enable automatic thread title generation
    },
  },
});

/**
 * Debug function to test carousel memory functionality
 * This helps verify that resource-scoped memory is working correctly
 */
export const debugCarouselMemory = async (resourceId: string, threadId: string) => {
  try {
    console.log(`🔍 [Carousel Memory Debug] Testing memory for resourceId: ${resourceId}, threadId: ${threadId}`);

    // Test 1: Get all threads for this resource
    const threads = await carouselMemory.getThreadsByResourceId({ resourceId });
    console.log(`📋 [Carousel Memory Debug] Found ${threads.length} threads for resource ${resourceId}`);

    // Test 2: Query recent messages to check if memory is working
    const queryResult = await carouselMemory.query({
      threadId,
      resourceId,
      selectBy: { last: 5 }
    });
    console.log(`💬 [Carousel Memory Debug] Recent messages: ${queryResult.messages.length} found`);

    // Test 3: Check if semantic recall is working by searching for similar messages
    const semanticResult = await carouselMemory.query({
      threadId,
      resourceId,
      selectBy: {
        vectorSearchString: "carousel brand kit generation"
      },
      threadConfig: {
        semanticRecall: true
      }
    });
    console.log(`🔍 [Carousel Memory Debug] Semantic search results: ${semanticResult.messages.length} found`);

    return {
      threadsCount: threads.length,
      recentMessagesCount: queryResult.messages.length,
      semanticResultsCount: semanticResult.messages.length
    };
  } catch (error) {
    console.error(`❌ [Carousel Memory Debug] Error testing memory:`, error);
    throw error;
  }
};

export default carouselMemory;
