import { z } from "zod";

export const carouselInputSchema = z.object({
  topic: z.string().min(5).max(200),
  format: z.enum([
    "hook_slide",
    "photo_dump",
    "educational",
    "interactive",
    "transformation",
    "curated_collection",
  ]),
  targetEngagement: z.enum([
    "discovery",
    "followers",
    "engagement",
    "conversion",
  ]),
  slideCount: z.number().min(3).max(20).default(10),
  toneOfVoice: z
    .enum(["professional", "casual", "playful", "inspirational"])
    .default("professional"),
});

export const carouselSchema = z.object({
  topic: z.string(),
  format: z.string(),
  targetEngagement: z.string(),
  slideCount: z.number(),
  toneOfVoice: z.string(),
  content: z.object({
    slides: z.array(
      z.object({
        slideNumber: z.number(),
        type: z.string(),
        headline: z.string(),
        subheadline: z.string(),
        bodyText: z.string(),
        psychologyFramework: z.string(),
      })
    ),
    strategy: z.string(),
  }),
});

export const slideSchema = z.object({
  slideNumber: z.number(),
  type: z.enum(["hook", "content", "cta"]),
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  bodyText: z.string().optional(),
  ctaText: z.string().optional(),
  imagePath: z.string().optional(),
  imagePrompt: z.string().optional(),
  backgroundColor: z.string(),
  textColor: z.string(),
  accentColor: z.string(),
  psychologyFramework: z.string().optional(),
});

export const carouselOutputSchema = z.object({
  carouselId: z.string(),
  slides: z.array(slideSchema),
  scores: z.object({
    brandConsistency: z.number().min(0).max(100),
    designQuality: z.number().min(0).max(100),
    accessibility: z.number().min(0).max(100),
    psychologyEffectiveness: z.number().min(0).max(100),
    algorithmOptimization: z.number().min(0).max(100),
  }),
  overallScore: z.number().min(0).max(100),
  recommendedCaption: z.string(),
  recommendedHashtags: z.array(z.string()),
  downloadUrls: z.array(z.string()),
});

export type CarouselInput = z.infer<typeof carouselInputSchema>;
export type SlideData = z.infer<typeof slideSchema>;
export type CarouselOutput = z.infer<typeof carouselOutputSchema>;
