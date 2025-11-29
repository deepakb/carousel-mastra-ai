import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { createScorer } from '@mastra/core/scores';

// 1. Viral Hook Scorer
export const viralHookScorer = createScorer({
    name: 'Viral Hook Quality',
    description: 'Evaluates the scroll-stopping power of the first slide hook',
    type: 'agent',
    judge: {
        model: google('gemini-2.5-flash'),
        instructions: `You are a viral content expert. Evaluate the hook (Slide 1 headline) for curiosity, brevity (< 10 words), and emotional impact.`,
    },
})
    .preprocess(({ run }) => {
        const output = run.output?.[0]?.content as string; // Assuming output is the carousel JSON
        let hook = "";
        try {
            const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/i) || output.match(/```\s*([\s\S]*?)\s*```/i);
            const jsonStr = jsonMatch ? jsonMatch[1] : output;
            const parsed = JSON.parse(jsonStr);
            hook = parsed.slides?.find((s: any) => s.slideNumber === 1)?.headline || "";
        } catch (e) {
            // Fallback or empty
        }
        return { hook };
    })
    .analyze({
        description: 'Analyze the hook for viral traits',
        outputSchema: z.object({
            isShort: z.boolean(),
            hasCuriosityGap: z.boolean(),
            emotionalImpact: z.number().min(0).max(10),
            explanation: z.string(),
        }),
        createPrompt: ({ results }) => `
      Analyze this hook: "${results.preprocessStepResult.hook}"
      
      Criteria:
      1. Is it under 10 words?
      2. Does it create a curiosity gap (make you want to swipe)?
      3. Rate emotional impact (0-10).
      
      Return JSON.
    `,
    })
    .generateScore(({ results }) => {
        const r = (results as any)?.analyzeStepResult || {};
        let score = 0;
        if (r.isShort) score += 0.3;
        if (r.hasCuriosityGap) score += 0.4;
        score += (r.emotionalImpact / 10) * 0.3;
        return Math.min(1, score);
    })
    .generateReason(({ results, score }) => {
        const r = (results as any)?.analyzeStepResult || {};
        return `Hook Score: ${score.toFixed(2)}. ${r.explanation}`;
    });

// 2. Brand Voice Scorer
export const brandVoiceScorer = createScorer({
    name: 'Brand Voice Consistency',
    description: 'Checks if the content matches the defined tone of voice',
    type: 'agent',
    judge: {
        model: google('gemini-2.5-flash'),
        instructions: `You are a Brand Strategist. Evaluate if the content matches the target tone of voice.`,
    },
})
    .preprocess(({ run }) => {
        const input = run.input?.inputMessages?.[0]?.content as string; // Assuming input contains tone
        const output = run.output?.[0]?.content as string;
        return { input, output };
    })
    .analyze({
        description: 'Compare content tone against target tone',
        outputSchema: z.object({
            matchScore: z.number().min(0).max(10),
            explanation: z.string(),
        }),
        createPrompt: ({ results }) => `
      Target Tone (from input): "${results.preprocessStepResult.input}"
      Content (from output): "${results.preprocessStepResult.output}"
      
      Rate the consistency (0-10).
      Return JSON.
    `,
    })
    .generateScore(({ results }) => {
        const r = (results as any)?.analyzeStepResult || {};
        return r.matchScore / 10;
    })
    .generateReason(({ results }) => {
        const r = (results as any)?.analyzeStepResult || {};
        return `Brand Voice Match: ${r.matchScore}/10. ${r.explanation}`;
    });

// 3. Visual Consistency Scorer
export const visualConsistencyScorer = createScorer({
    name: 'Visual Consistency',
    description: 'Evaluates if image prompts adhere to the style guide',
    type: 'agent',
    judge: {
        model: google('gemini-2.5-flash'),
        instructions: `You are an Art Director. Check if image prompts follow the style guide.`,
    },
})
    .preprocess(({ run }) => {
        const output = run.output?.[0]?.content as string;
        return { output };
    })
    .analyze({
        description: 'Check style guide adherence',
        outputSchema: z.object({
            consistencyScore: z.number().min(0).max(10),
            explanation: z.string(),
        }),
        createPrompt: ({ results }) => `
      Analyze the JSON output. Look for "styleGuide" and "prompts".
      Do the prompts explicitly use the keywords from the style guide?
      
      Output: "${results.preprocessStepResult.output}"
      
      Rate consistency (0-10).
      Return JSON.
    `,
    })
    .generateScore(({ results }) => {
        const r = (results as any)?.analyzeStepResult || {};
        return r.consistencyScore / 10;
    })
    .generateReason(({ results }) => {
        const r = (results as any)?.analyzeStepResult || {};
        return `Visual Consistency: ${r.consistencyScore}/10. ${r.explanation}`;
    });

// 4. Structure Scorer
export const structureScorer = createScorer({
    name: 'Carousel Structure',
    description: 'Validates the Hook -> Value -> CTA flow',
    type: 'agent',
    judge: {
        model: google('gemini-2.5-flash'),
        instructions: `You are a Content Architect. Verify the carousel structure.`,
    },
})
    .preprocess(({ run }) => {
        const output = run.output?.[0]?.content as string;
        return { output };
    })
    .analyze({
        description: 'Check structural integrity',
        outputSchema: z.object({
            hasHook: z.boolean(),
            hasValue: z.boolean(),
            hasCTA: z.boolean(),
            explanation: z.string(),
        }),
        createPrompt: ({ results }) => `
      Analyze the JSON output slides.
      1. Is Slide 1 a Hook?
      2. Are middle slides Value?
      3. Is the last slide a CTA?
      
      Output: "${results.preprocessStepResult.output}"
      
      Return JSON.
    `,
    })
    .generateScore(({ results }) => {
        const r = (results as any)?.analyzeStepResult || {};
        let score = 0;
        if (r.hasHook) score += 0.3;
        if (r.hasValue) score += 0.4;
        if (r.hasCTA) score += 0.3;
        return Math.min(1, score);
    })
    .generateReason(({ results, score }) => {
        const r = (results as any)?.analyzeStepResult || {};
        return `Structure Score: ${score.toFixed(2)}. ${r.explanation}`;
    });

// 5. Readability Scorer
export const readabilityScorer = createScorer({
    name: 'Readability & Brevity',
    description: 'Checks if slides are concise (< 125 chars) and readable',
    type: 'agent',
    judge: {
        model: google('gemini-2.5-flash'),
        instructions: `You are a Copy Editor. Check character counts and readability.`,
    },
})
    .preprocess(({ run }) => {
        const output = run.output?.[0]?.content as string;
        return { output };
    })
    .analyze({
        description: 'Analyze text length and complexity',
        outputSchema: z.object({
            maxCharCount: z.number(),
            isReadable: z.boolean(),
            explanation: z.string(),
        }),
        createPrompt: ({ results }) => `
      Analyze the JSON output.
      1. Find the slide with the longest body text. Count its characters.
      2. Is the language simple and punchy?
      
      Output: "${results.preprocessStepResult.output}"
      
      Return JSON.
    `,
    })
    .generateScore(({ results }) => {
        const r = (results as any)?.analyzeStepResult || {};
        if (r.maxCharCount > 150) return 0; // Strict penalty
        if (r.maxCharCount > 125) return 0.5; // Warning
        return r.isReadable ? 1 : 0.8;
    })
    .generateReason(({ results }) => {
        const r = (results as any)?.analyzeStepResult || {};
        return `Readability: Max chars=${r.maxCharCount}. ${r.explanation}`;
    });

// 6. Scroll Stopper Scorer
export const scrollStopperScorer = createScorer({
    name: 'Scroll Stopper',
    description: 'Evaluates if Slide 1 is a true scroll stopper',
    type: 'agent',
    judge: {
        model: google('gemini-2.5-flash'),
        instructions: `You are a Social Media Expert. Evaluate Slide 1.`,
    },
})
    .preprocess(({ run }) => {
        const output = run.output?.[0]?.content as string;
        return { output };
    })
    .analyze({
        description: 'Analyze Slide 1 impact',
        outputSchema: z.object({
            isBold: z.boolean(),
            hasPromise: z.boolean(),
            score: z.number().min(0).max(10),
            explanation: z.string(),
        }),
        createPrompt: ({ results }) => `
      Analyze Slide 1 in the JSON.
      1. Is the visual/text BOLD?
      2. Does it make a clear PROMISE?
      
      Output: "${results.preprocessStepResult.output}"
      
      Rate it 0-10.
    `,
    })
    .generateScore(({ results }) => {
        const r = (results as any)?.analyzeStepResult || {};
        return r.score / 10;
    })
    .generateReason(({ results }) => {
        const r = (results as any)?.analyzeStepResult || {};
        return `Scroll Stopper: ${r.score}/10. ${r.explanation}`;
    });
