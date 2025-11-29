import 'dotenv/config';
import { viralHookScorer, brandVoiceScorer } from "./scorers/carousel-scorer";

async function main() {
    console.log("🚀 Testing Enterprise Scorers...");

    // Mock Data
    const mockHookRun = {
        output: [{ content: JSON.stringify({ slides: [{ slideNumber: 1, headline: "Stop Coding. Start Designing." }] }) }]
    };

    const mockBrandRun = {
        input: { inputMessages: [{ content: "Professional" }] },
        output: [{ content: "Yo fam, check this out!" }] // Should fail
    };

    // Test Viral Hook
    console.log("\n1. Testing Viral Hook Scorer...");
    const hookResult = await viralHookScorer.run({ run: mockHookRun as any });
    console.log("Result:", JSON.stringify(hookResult, null, 2));

    // Test Brand Voice
    console.log("\n2. Testing Brand Voice Scorer (Mismatch)...");
    const brandResult = await brandVoiceScorer.run({ run: mockBrandRun as any });
    console.log("Result:", JSON.stringify(brandResult, null, 2));

    console.log("\n✅ Scorer Verification Complete!");
}

main().catch(console.error);
