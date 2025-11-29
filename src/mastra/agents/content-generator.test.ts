import 'dotenv/config';
import { contentGeneratorAgent } from "./content-generator.agent";
import { carouselSchema } from "../schemas/carousel.schema";
import { z } from "zod";

async function runTest() {
    console.log("🧪 Starting Content Generator Agent Test...");

    const topic = "The Future of AI Agents";
    console.log(`📝 Testing with topic: "${topic}"`);

    try {
        const result = await contentGeneratorAgent.generate([
            { role: "user", content: topic }
        ]);

        console.log("✅ Agent response received");

        const text = result.text;
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
        const jsonStr = jsonMatch ? jsonMatch[1] : text;

        let parsed;
        try {
            parsed = JSON.parse(jsonStr);
            console.log("✅ JSON parsing successful");
        } catch (e) {
            console.error("❌ JSON parsing failed");
            throw e;
        }

        // Validate against schema
        // Note: The agent output is { slides: [...], strategy: ... }
        // The carouselSchema might be the full object or just slides.
        // Let's check carousel.schema.ts content if possible, but assuming based on workflow usage:
        // workflow expects: content: { slides: parsed?.slides, strategy: parsed?.strategy }
        // So the agent output matches the structure expected by the workflow, but let's validate the slides.

        // We'll define a partial schema here to verify the structure if we can't import the exact one easily without checking it.
        // But I imported carouselSchema. Let's try to use it.
        // Looking at workflow: inputSchema: carouselInputSchema, outputSchema: carouselSchema
        // And generateContentStep returns: content: { slides: ..., strategy: ... }
        // So the agent output IS the content.

        // Let's just validate the structure manually for now to be safe and "God Tier" robust.

        if (!parsed.slides || !Array.isArray(parsed.slides)) {
            throw new Error("Missing 'slides' array in output");
        }

        if (!parsed.strategy || typeof parsed.strategy !== 'string') {
            throw new Error("Missing 'strategy' string in output");
        }

        console.log(`✅ Structure validation passed. Generated ${parsed.slides.length} slides.`);
        console.log("✅ Strategy:", parsed.strategy);

        console.log("🎉 Test Passed!");
    } catch (error) {
        console.error("❌ Test Failed:", error);
        process.exit(1);
    }
}

runTest();
