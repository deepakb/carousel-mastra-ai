import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { supervisorAgent } from "./agents/supervisor.agent";
import { contentGeneratorAgent } from "./agents/content-generator.agent";
import { hookEngineeringAgent } from "./agents/hook-engineer.agent";
import { brandStrategyAgent } from "./agents/brand-strategy.agent";
import { imageGenerationAgent } from "./agents/image-generator.agent";
import { aestheticValidatorAgent } from "./agents/aesthetic-validator.agent";
import { copyEditorAgent } from "./agents/copy-editor.agent";
import { designAgent } from "./agents/design.agent";

import {
  viralHookScorer,
  brandVoiceScorer,
  visualConsistencyScorer,
  structureScorer,
  readabilityScorer,
  scrollStopperScorer,
} from "./scorers/carousel-scorer";
import carouselGenerationWorkflow from "./workflows/carousel-generation.workflow";

import { creativeDirectorAgent } from "./agents/creative-director.agent";

export const mastra = new Mastra({
  workflows: { carouselGenerationWorkflow },
  agents: {
    supervisorAgent,
    contentGeneratorAgent,
    hookEngineeringAgent,
    brandStrategyAgent,
    imageGenerationAgent,
    aestheticValidatorAgent,
    creativeDirectorAgent,
    copyEditorAgent,
    designAgent,
  },
  scorers: {
    viralHookScorer,
    brandVoiceScorer,
    visualConsistencyScorer,
    structureScorer,
    readabilityScorer,
    scrollStopperScorer,
  },
  storage: new LibSQLStore({
    // Using file-based storage for persistence
    url: "file:carousel-memory.db",
  }) as any,
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false,
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true },
  },
});
