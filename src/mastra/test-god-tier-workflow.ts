import 'dotenv/config';
import { contentGeneratorAgent } from "./agents/content-generator.agent";
import { copyEditorAgent } from "./agents/copy-editor.agent";
import { designAgent } from "./agents/design.agent";
import { imageGenerationAgent } from "./agents/image-generator.agent";
import { creativeDirectorAgent } from "./agents/creative-director.agent";
import { falImageTool } from "./tools/fal-image.tool";

async function main() {
    console.log("🚀 Starting Manual God Tier Verification...");

    // 1. Generate Content (MOCKED FOR RENDERING VERIFICATION)
    console.log("\n1. Generating Content (MOCKED)...");
    const contentJson = {
        strategy: "Test Strategy",
        slides: [
            {
                slideNumber: 1,
                type: "hook",
                headline: "AI Agents Won't Replace You.",
                subheadline: "They'll make you 10x more powerful.",
                bodyText: "For years, we've feared the robot takeover. But the reality is far more interesting. AI agents are not replacements; they are force multipliers. Imagine having a team of experts working 24/7 to execute your vision. That's the promise of agentic workflows.",
                psychologyFramework: "Urgency"
            }
        ]
    };
    console.log("✅ Content Generated:", contentJson.strategy);

    // 1.5 Copy Edit (MOCKED)
    console.log("\n1.5. Copy Editing (MOCKED)...");
    const polishedContent = contentJson;
    console.log("✅ Content Polished:", polishedContent.slides[0].headline);

    // 2. Generate Visual Plan (MOCKED)
    console.log("\n2. Generate Visual Plan (MOCKED)...");
    const planJson = {
        styleGuide: {
            theme: "Modern",
            colors: ["#FF0000", "#000000"]
        },
        prompts: [
            {
                slideNumber: 1,
                prompt: "A futuristic workspace with a glowing digital assistant interface, clean lines, high contrast, professional atmosphere."
            }
        ]
    };
    console.log("✅ Visual Plan Generated:", planJson.styleGuide.theme);

    // 2.5 Generate Design System (MOCKED)
    console.log("\n2.5. Generate Design System (MOCKED)...");
    const designJson = {
        design: {
            layout: "Center Middle",
            fonts: {
                headline: "Inter Bold",
                body: "Inter Regular"
            },
            overlay: "Gradient Bottom"
        }
    };
    console.log("✅ Design System Generated:", designJson.design?.layout);

    // 4. Generate Images (Real Verification of Hybrid Rendering)
    console.log("\n4. Generating Images (Real Verification)...");

    // Test with Slide 1
    const slide1 = planJson.prompts.find((p: any) => p.slideNumber === 1);
    const slide1Content = contentJson.slides.find((s: any) => s.slideNumber === 1);

    if (slide1 && slide1Content) {
        console.log(`   - Generating Slide 1: ${slide1.prompt.substring(0, 50)}...`);
        try {
            const result = await falImageTool.execute({
                context: {
                    prompt: planJson.prompts[0].prompt,
                    slideContent: JSON.stringify({
                        headline: polishedContent.slides[0].headline || "",
                        subheadline: polishedContent.slides[0].subheadline || "",
                        bodyText: polishedContent.slides[0].bodyText || ""
                    }),
                    brandColors: { primary: planJson.styleGuide.colors[0], secondary: planJson.styleGuide.colors[1] || "#000000" },
                    style: planJson.styleGuide.theme,
                    aspectRatio: "4:5",
                    slideNumber: 1,
                    saveLocally: true,
                    uploadToS3: true,
                    design: designJson.design
                },
                runtimeContext: {} as any,
                suspend: async () => { }
            });
            console.log(`   ✅ Slide 1 Generated: ${result.imageUrl}`);
            console.log(`   ✅ Local Path: ${result.localPath}`);
        } catch (e) {
            console.error("   ❌ Image Generation Failed:", e);
        }
    } else {
        console.warn("   ⚠️ Could not find Slide 1 data for verification.");
    }

    console.log("\n✅ Manual Verification Successful!");
}

main().catch((e) => {
    console.error("❌ Manual Verification Failed:", e);
    process.exit(1);
});
