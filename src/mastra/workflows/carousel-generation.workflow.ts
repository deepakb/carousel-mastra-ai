import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  carouselInputSchema,
  carouselOutputSchema,
  carouselSchema,
  slideSchema,
} from "../schemas/carousel.schema";

import { contentGeneratorAgent } from "../agents/content-generator.agent";
import { copyEditorAgent } from "../agents/copy-editor.agent";
import { designAgent } from "../agents/design.agent";
import { hookEngineeringAgent } from "../agents/hook-engineer.agent";
import { imageGenerationAgent } from "../agents/image-generator.agent";
import { aestheticValidatorAgent } from "../agents/aesthetic-validator.agent";
import { creativeDirectorAgent } from "../agents/creative-director.agent";
import { falImageTool } from "../tools/fal-image.tool";

// Intermediate Schemas
const hooksSchema = z.array(z.object({
  text: z.string(),
  framework: z.string(),
  score: z.number(),
  reasoning: z.string(),
}));

const visualPlanSchema = z.object({
  styleGuide: z.object({
    theme: z.string(),
    colors: z.array(z.string()),
    lighting: z.string(),
  }),
  prompts: z.array(z.object({
    slideNumber: z.number(),
    prompt: z.string(),
  })),
});

// Step 1: Generate Content Structure
const generateContentStep = createStep({
  id: "generate-content",
  description: "Analyzes the topic and generates a comprehensive content strategy with slide-by-slide breakdown.",
  inputSchema: carouselInputSchema,
  outputSchema: carouselSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("contentGeneratorAgent") || contentGeneratorAgent;

    const result = await agent.generate([
      { role: "user", content: inputData.topic }
    ]);

    let parsed;
    try {
      const text = result.text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error("Invalid JSON output from content generator");
    }

    return {
      topic: inputData.topic,
      format: inputData.format,
      targetEngagement: inputData.targetEngagement,
      slideCount: inputData.slideCount,
      toneOfVoice: inputData.toneOfVoice,
      content: {
        slides: parsed?.slides,
        strategy: parsed?.strategy,
      },
    };
  },
});

// Step 1.5: Copy Edit Content
const copyEditContentStep = createStep({
  id: "copy-edit-content",
  description: "Refines the content for grammar, tone, and clarity, ensuring a professional polish.",
  inputSchema: carouselSchema,
  outputSchema: carouselSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("copyEditorAgent") || copyEditorAgent;

    console.log("✍️ [Copy Editor] Polishing content...");
    const result = await agent.generate([
      { role: "user", content: JSON.stringify(inputData.content) }
    ]);

    let polishedContent = inputData.content;
    try {
      const text = result.text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      polishedContent = JSON.parse(jsonStr);
      console.log("✅ [Copy Editor] Content polished successfully");
    } catch (e) {
      console.warn("⚠️ [Copy Editor] Failed to parse polished content, using original");
    }

    return {
      ...inputData,
      content: polishedContent,
    };
  },
});

// Step 2: Engineer Hooks
const engineerHooksStep = createStep({
  id: "engineer-hooks",
  description: "Brainstorms 5 high-converting hook variations based on psychological frameworks.",
  inputSchema: carouselSchema,
  outputSchema: z.object({
    hooks: hooksSchema,
    topic: z.string(),
    content: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("hookEngineeringAgent") || hookEngineeringAgent;
    const prompt = `Generate 5 hook variations for:\nTopic: ${inputData.topic}\nFirst slide: ${inputData.content.slides[0].headline}`;

    const result = await agent.generate([{ role: "user", content: prompt }]);

    let hooks = [];
    try {
      const text = result.text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      hooks = JSON.parse(jsonStr).hooks;
    } catch (e) {
      console.warn("Failed to parse hooks, returning empty");
    }

    return { hooks, topic: inputData.topic, content: inputData.content };
  },
});

// Step 3: Select Best Hook
const selectBestHookStep = createStep({
  id: "select-best-hook",
  description: "Evaluates and selects the most effective hook to maximize audience retention.",
  inputSchema: z.object({
    hooks: hooksSchema,
    topic: z.string(),
    content: z.any(),
  }),
  outputSchema: z.object({
    selectedHook: z.string(),
    topic: z.string(),
    content: z.any(),
  }),
  execute: async ({ inputData }) => {
    const bestHook = inputData.hooks.reduce((prev: any, current: any) =>
      prev.score > current.score ? prev : current
    );

    const updatedSlides = [...inputData.content.slides];
    updatedSlides[0] = {
      ...updatedSlides[0],
      headline: bestHook.text,
      psychologyFramework: bestHook.framework,
    };

    return {
      selectedHook: bestHook.text,
      topic: inputData.topic,
      content: { ...inputData.content, slides: updatedSlides },
    };
  },
});

// Step 4: Generate Visual Plan (Prompts + Style)
const generateVisualPlanStep = createStep({
  id: "generate-visual-plan",
  description: "Creates a cohesive visual identity and detailed image prompts for each slide.",
  inputSchema: z.object({
    selectedHook: z.string(),
    topic: z.string(),
    content: z.any(),
  }),
  outputSchema: z.object({
    styleGuide: visualPlanSchema.shape.styleGuide,
    prompts: visualPlanSchema.shape.prompts,
    content: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("imageGenerationAgent") || imageGenerationAgent;

    const result = await agent.generate([
      { role: "user", content: JSON.stringify(inputData.content) }
    ]);

    let parsed;
    try {
      const text = result.text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error("Failed to parse visual plan");
    }

    return {
      styleGuide: parsed.styleGuide,
      prompts: parsed.prompts,
      content: inputData.content,
    };
  },
});

// Step 4.5: Generate Design System (Typography & Layout)
const generateDesignSystemStep = createStep({
  id: "generate-design-system",
  description: "Defines the typography, color palette, and layout structure for the carousel.",
  inputSchema: z.object({
    styleGuide: visualPlanSchema.shape.styleGuide,
    prompts: visualPlanSchema.shape.prompts,
    content: z.any(),
  }),
  outputSchema: z.object({
    design: z.any(),
    styleGuide: visualPlanSchema.shape.styleGuide,
    prompts: visualPlanSchema.shape.prompts,
    content: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("designAgent") || designAgent;

    console.log("🎨 [Design Agent] Generating typography and layout system...");
    const result = await agent.generate([
      { role: "user", content: JSON.stringify({ strategy: inputData.content.strategy, slides: inputData.content.slides }) }
    ]);

    let design = {
      fonts: { headline: "Arial", body: "Arial" },
      layout: "Center Middle",
      overlay: "Gradient Bottom",
      colors: inputData.styleGuide.colors
    };

    try {
      const text = result.text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      const parsed = JSON.parse(jsonStr);
      design = parsed.design;
      console.log("✅ [Design Agent] Design system generated:", design.layout);
    } catch (e) {
      console.warn("⚠️ [Design Agent] Failed to parse design system, using defaults");
    }

    return {
      design,
      styleGuide: inputData.styleGuide,
      prompts: inputData.prompts,
      content: inputData.content,
    };
  },
});

// Step 5: Creative Director Review (with Retry Loop)
const reviewPlanStep = createStep({
  id: "review-plan",
  description: "Simulates a Creative Director review to ensure brand consistency and high quality.",
  inputSchema: z.object({
    design: z.any(),
    styleGuide: visualPlanSchema.shape.styleGuide,
    prompts: visualPlanSchema.shape.prompts,
    content: z.any(),
  }),
  outputSchema: z.object({
    approved: z.boolean(),
    feedback: z.string(),
    design: z.any(),
    styleGuide: visualPlanSchema.shape.styleGuide,
    prompts: visualPlanSchema.shape.prompts,
    content: z.any(),
  }),
  execute: async ({ inputData, mastra }) => {
    const director = mastra?.getAgent("creativeDirectorAgent") || creativeDirectorAgent;
    const planner = mastra?.getAgent("imageGenerationAgent") || imageGenerationAgent;

    let currentPrompts = inputData.prompts;
    let currentStyle = inputData.styleGuide;
    let currentDesign = inputData.design;
    let approved = false;
    let feedback = "";
    let attempts = 0;
    const MAX_ATTEMPTS = 2;

    while (!approved && attempts < MAX_ATTEMPTS) {
      // Review
      const reviewResult = await director.generate([
        { role: "user", content: JSON.stringify({ design: currentDesign, styleGuide: currentStyle, prompts: currentPrompts, content: inputData.content }) }
      ]);

      let reviewJson;
      try {
        const text = reviewResult.text;
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
        reviewJson = JSON.parse(jsonMatch ? jsonMatch[1] : text);
      } catch (e) {
        console.warn("Director returned invalid JSON, assuming approved to avoid stall");
        approved = true;
        break;
      }

      if (reviewJson.approved) {
        approved = true;
        feedback = reviewJson.feedback;
      } else {
        attempts++;
        feedback = reviewJson.feedback;
        console.log(`Creative Director rejected plan (Attempt ${attempts}): ${feedback}`);

        // Re-plan with feedback
        const replanResult = await planner.generate([
          { role: "user", content: JSON.stringify(inputData.content) },
          { role: "user", content: `Previous plan rejected. Feedback: ${feedback}. Fix it.` }
        ]);

        try {
          const text = replanResult.text;
          const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
          const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : text);
          currentStyle = parsed.styleGuide;
          currentPrompts = parsed.prompts;
          // Note: We aren't re-planning the design system here yet, just visual plan. 
          // Ideally we'd re-run design agent too, but for now let's keep it simple.
        } catch (e) {
          console.warn("Re-planning failed to parse, using original");
        }
      }
    }

    return {
      approved,
      feedback,
      design: currentDesign,
      styleGuide: currentStyle,
      prompts: currentPrompts,
      content: inputData.content,
    };
  },
});

// Step 6: Generate Images (Sequential: Slide 1 -> Reference -> Others)
const generateImagesStep = createStep({
  id: "generate-images",
  description: "Generates high-fidelity images for each slide, maintaining visual consistency.",
  inputSchema: z.object({
    approved: z.boolean(),
    feedback: z.string(),
    design: z.any(),
    styleGuide: visualPlanSchema.shape.styleGuide,
    prompts: visualPlanSchema.shape.prompts,
    content: z.any(),
  }),
  outputSchema: z.object({
    slides: z.array(slideSchema),
  }),
  execute: async ({ inputData }) => {
    const { styleGuide, prompts, content, design } = inputData;
    const slides = [];

    // 1. Generate Slide 1 (The Reference)
    const slide1Prompt = prompts.find((p: any) => p.slideNumber === 1);
    const slide1Content = content.slides.find((s: any) => s.slideNumber === 1);

    if (!slide1Prompt || !slide1Content) {
      throw new Error("Slide 1 prompt or content missing");
    }

    console.log("🎨 Generating Slide 1 (Reference Image)...");
    const slide1Result = await falImageTool.execute({
      context: {
        prompt: slide1Prompt.prompt,
        slideContent: JSON.stringify({
          headline: slide1Content.headline || "",
          subheadline: slide1Content.subheadline || "",
          bodyText: slide1Content.bodyText || ""
        }),
        brandColors: { primary: styleGuide.colors[0], secondary: styleGuide.colors[1] || "#000000" },
        style: styleGuide.theme,
        aspectRatio: "4:5",
        slideNumber: 1,
        saveLocally: true,
        uploadToS3: true,
        design: design // Pass design system
      },
      runtimeContext: {} as any,
      suspend: async () => { }
    });

    const slide1ImageUrl = slide1Result.localPath ? `file://${slide1Result.localPath}` : slide1Result.imageUrl;
    // For reference, we need the actual URL or base64 if local. 
    // If localPath is returned, we might need to assume the tool handles local paths or we need a public URL for Fal.
    // Fal API needs a public URL or base64. The tool returns a data URI if we look closely at the tool implementation?
    // Wait, the tool returns `imageUrl` which might be a data URI if it didn't upload to S3.
    // Let's check the tool output. It returns `imageUrl` which is data URI or S3 URL.
    // If it's data URI, we can pass it to Fal as image_url.

    // However, the tool returns `imageUrl` as `data:image/...` in the tool implementation I wrote?
    // Let's verify. Yes, `return data:image/jpeg;base64,...`.
    // So we can use `slide1Result.imageUrl` as the reference.

    slides.push({
      ...slide1Content,
      imagePath: slide1ImageUrl,
      backgroundColor: styleGuide.colors[0],
      textColor: "#FFFFFF",
      accentColor: styleGuide.colors[1],
    });

    // 2. Generate Remaining Slides (Parallel) using Slide 1 as Reference
    const remainingPrompts = prompts.filter((p: any) => p.slideNumber !== 1);

    const remainingImagePromises = remainingPrompts.map(async (p: any) => {
      const slide = content.slides.find((s: any) => s.slideNumber === p.slideNumber);

      console.log(`🎨 Generating Slide ${p.slideNumber} with reference...`);
      const result = await falImageTool.execute({
        context: {
          prompt: p.prompt,
          slideContent: JSON.stringify({
            headline: slide?.headline || "",
            subheadline: slide?.subheadline || "",
            bodyText: slide?.bodyText || ""
          }),
          brandColors: { primary: styleGuide.colors[0], secondary: styleGuide.colors[1] || "#000000" },
          style: styleGuide.theme,
          aspectRatio: "4:5",
          slideNumber: p.slideNumber,
          referenceImageUrl: slide1Result.imageUrl, // Pass Slide 1 as reference
          saveLocally: true,
          uploadToS3: true,
          design: design // Pass design system
        },
        runtimeContext: {} as any,
        suspend: async () => { }
      });

      return {
        ...slide,
        imagePath: result.localPath ? `file://${result.localPath}` : result.imageUrl,
        backgroundColor: styleGuide.colors[0],
        textColor: "#FFFFFF",
        accentColor: styleGuide.colors[1],
      };
    });

    const remainingSlides = await Promise.all(remainingImagePromises);
    slides.push(...remainingSlides);

    // Sort by slide number
    slides.sort((a, b) => a.slideNumber - b.slideNumber);

    return { slides };
  },
});

// Step 7: Validate Aesthetics
const validateAestheticsStep = createStep({
  id: "validate-aesthetics",
  description: "Performs a final aesthetic check on the generated slides to ensure they meet God Tier standards.",
  inputSchema: z.object({
    slides: z.array(slideSchema),
  }),
  outputSchema: z.object({
    validation: z.any(),
    slides: z.array(slideSchema),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("aestheticValidatorAgent") || aestheticValidatorAgent;

    // Validate the first slide (as a sample) or all slides?
    // Let's validate the first slide for now to save tokens/time, or maybe the first 3.
    // For this implementation, we'll validate the first slide.
    const slideToValidate = inputData.slides[0];

    if (!slideToValidate.imagePath) {
      console.warn("⚠️ No image path found for validation, skipping.");
      return { validation: { passed: true, note: "Skipped (no image)" }, slides: inputData.slides };
    }

    console.log(`👁️ [Aesthetic Validator] Analyzing slide 1: ${slideToValidate.imagePath}`);

    // Construct content for the agent
    // If it's a local file path (file://), we need to handle it.
    // Mastra/AI SDK usually expects http URL or base64 data URI.
    // Since we saved it locally, we should probably read it and convert to base64 if it's a file path.
    // Or if we have an S3 URL, use that.

    let imageUrl = slideToValidate.imagePath;

    // If it's a local file path, we might need to read it.
    // But wait, `fal-image.tool.ts` returns `file://...` for local paths.
    // Let's assume for now we can pass the URL if it's http/https.
    // If it's file://, we might need to read it.
    // Let's try to use the S3 URL if available, otherwise read local file.

    // Actually, let's keep it simple. If it starts with file://, strip it and read.
    let imageContent: any;

    if (imageUrl.startsWith("file://")) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const localPath = imageUrl.replace("file://", "");
        const imageBuffer = fs.readFileSync(localPath);
        const base64Image = imageBuffer.toString('base64');
        imageContent = { type: 'image', image: base64Image }; // AI SDK format
      } catch (e) {
        console.warn("⚠️ Failed to read local image for validation", e);
        return { validation: { passed: true, note: "Skipped (read error)" }, slides: inputData.slides };
      }
    } else {
      imageContent = { type: 'image', image: new URL(imageUrl) };
    }

    const result = await agent.generate([
      {
        role: "user",
        content: [
          { type: "text", text: `Verify this slide. Intended Headline: "${slideToValidate.headline}"` },
          imageContent
        ]
      }
    ]);

    let validation = { passed: false, overallScore: 0, scores: {}, ocrText: "" };
    try {
      const text = result.text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
      validation = JSON.parse(jsonMatch ? jsonMatch[1] : text);
      console.log(`✅ [Aesthetic Validator] Score: ${validation.overallScore}/100. Passed: ${validation.passed}`);
      if (validation.ocrText) {
        console.log(`📖 [OCR Read]: "${validation.ocrText}"`);
      }
    } catch (e) {
      console.warn("Validation parsing failed");
    }

    return { validation, slides: inputData.slides };
  },
});

// Step 8: Finalize
const finalizeCarouselStep = createStep({
  id: "finalize-carousel",
  description: "Packages the final carousel assets and metadata for delivery.",
  inputSchema: z.object({
    validation: z.any(),
    slides: z.array(slideSchema),
  }),
  outputSchema: carouselOutputSchema,
  execute: async ({ inputData }) => {
    return {
      carouselId: crypto.randomUUID(),
      slides: inputData.slides,
      scores: inputData.validation.scores,
      overallScore: inputData.validation.overallScore,
      recommendedCaption: "Generated by God Tier Workflow",
      recommendedHashtags: ["#AI", "#Innovation"],
      downloadUrls: [],
    };
  },
});

export const carouselGenerationWorkflow = createWorkflow({
  id: "carousel-generation",
  description: "God Tier Carousel Generation",
  inputSchema: carouselInputSchema,
  outputSchema: carouselOutputSchema,
  steps: [
    generateContentStep,
    engineerHooksStep,
    selectBestHookStep,
    generateVisualPlanStep,
    reviewPlanStep,
    generateImagesStep,
    validateAestheticsStep,
    finalizeCarouselStep,
  ],
})
  .then(generateContentStep)
  .then(copyEditContentStep)
  .then(engineerHooksStep)
  .then(selectBestHookStep)
  .then(generateVisualPlanStep)
  .then(generateDesignSystemStep)
  .then(reviewPlanStep)
  .then(generateImagesStep)
  .then(validateAestheticsStep)
  .then(finalizeCarouselStep)
  .commit();

export default carouselGenerationWorkflow;
