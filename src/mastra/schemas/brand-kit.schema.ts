import { z } from 'zod';

export const brandKitInputSchema = z.object({
  name: z.string().min(1).max(100),
  niche: z.enum([
    'SaaS',
    'E-commerce',
    'Fitness',
    'Finance',
    'Real Estate',
    'Education',
    'Healthcare',
    'Food & Beverage',
    'Technology',
    'Creative',
  ]),
  descriptors: z
    .array(z.string())
    .length(4)
    .describe('4 brand personality descriptors'),
  targetAudience: z.string().min(10).max(500),
  competitorUrls: z.array(z.string().url()).max(3).optional(),
});

export const brandKitOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  niche: z.string(),
  descriptors: z.array(z.string()),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    neutral: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  typography: z.object({
    headlineFont: z.string(),
    bodyFont: z.string(),
  }),
  psychologyRationale: z.string(),
  competitorInsights: z.string().optional(),
});

export type BrandKitInput = z.infer<typeof brandKitInputSchema>;
export type BrandKitOutput = z.infer<typeof brandKitOutputSchema>;
