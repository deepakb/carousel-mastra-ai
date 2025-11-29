# EVALS: CarouselMaster AI Evaluation Suite

This project implements a comprehensive evaluation system for carousel content, brand kits, and generated images. The system provides both heuristic and LLM-based metrics to ensure high-quality, brand-consistent, and engaging outputs.

## Implemented Metrics

### Carousel Metrics
- **Structure**: Valid JSON with required fields per slide (`slideNumber`, `headline`, `bodyText`, `ctaText`, `imagePath`, etc.)
- **Content Quality**: Slide text is relevant, concise, and matches the topic/format.
- **Hook Effectiveness**: Slide 1 hooks scored for curiosity, brevity, and engagement potential.
- **Slide Progression**: Logical flow and progressive revelation across slides.
- **CTA Quality**: Final slide CTA is clear, compelling, and actionable.

### Brand Kit Metrics
- **Color Accessibility**: All palette combinations pass WCAG AA contrast.
- **Typography Readability**: Font sizes and pairings are mobile-optimized.
- **Aesthetic Consistency**: Brand kit matches descriptors and niche.

### Image Generation Metrics
- **Brand Color Usage**: Generated images use primary/secondary/neutral colors as overlays or accents.
- **Visual Consistency**: If carousels feature recurring characters/mascots, vision-based analysis checks for consistency across slides.
- **Text Readability**: Rendered text in images is legible at thumbnail and mobile size.
- **Scene Coherence**: Backgrounds, lighting, and composition are consistent with the brand kit and slide content.

### Algorithmic Optimization Metrics
- **Swipe-Through Potential**: Predicted engagement based on hook, progression, and CTA scoring.
- **Format Alignment**: Carousel matches selected format (e.g., photo dump, educational, interactive).

## Scoring (0.0–1.0)
- **0.9–1.0**: Excellent
- **0.8–0.89**: Good
- **0.7–0.79**: Acceptable
- **0.6–0.69**: Needs improvement
- **< 0.6**: Poor

## How to Run

### Easiest: Run the evaluation script
```bash
# From project root (ensure OPENAI_API_KEY and GEMINI_API_KEY are set)
npx tsx examples/evals.ts
```

### Direct metric call
```ts
import { carouselEvals } from './src/mastra/evals/carousel-evals';

const input = 'Generate a 10-slide carousel for SaaS onboarding.';
const output = JSON.stringify({
  slides: [
    {
      slideNumber: 1,
      headline: 'Unlock Growth',
      bodyText: 'Why onboarding matters for SaaS startups.',
      ctaText: null,
      imagePath: 'generated-images/slide_1.png',
    },
    // ...
  ],
});

const result = await carouselEvals.structure.measure(input, output);
console.log('Structure Score:', result.score, result.info);
```

## Notes & Tips
- **Heuristic metrics** provide fast feedback for structure/content.
- **Vision-based metrics** (if enabled) use LLMs for advanced image analysis.
- **Image paths** in carousel JSON should use `imagePath` for evaluation.
- **Env vars required**: `OPENAI_API_KEY`, `GEMINI_API_KEY`.

## Requirements
- All outputs must match the expected JSON shape for evaluation.
- Brand kits and images must be accessible for full scoring.

## Not Included
- No script/storyboard metrics unless your app supports those workflows.
- No separate CI/CLI harness (use provided example scripts).

## Vision-Based Evaluation Features
- **Multi-modal Analysis**: Processes generated images using Gemini or GPT-4o vision.
- **Automatic Image Processing**: Converts local file paths to base64 for LLM analysis.
- **Detailed Reporting**: Per-slide and per-carousel breakdown, specific issues highlighted.
