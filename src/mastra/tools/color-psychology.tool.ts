import { createTool } from "@mastra/core";
import { z } from "zod";

export const colorPsychologyTool = createTool({
  id: "analyze-color-psychology",
  description: "Generate brand colors based on psychology principles and niche",

  inputSchema: z.object({
    niche: z.string(),
    descriptors: z.array(z.string()),
    targetAudience: z.string(),
  }),

  outputSchema: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    neutralColor: z.string(),
    accentColor: z.string(),
    rationale: z.string(),
  }),

  execute: async ({ context }) => {
    const { niche, descriptors, targetAudience } = context;

    // Color psychology mapping
    const nicheColorMap: Record<
      string,
      { primary: string; secondary: string; rationale: string }
    > = {
      SaaS: {
        primary: "#0066CC",
        secondary: "#FF9933",
        rationale:
          "Blue conveys trust and reliability (tech industry standard). Orange adds warmth and innovation.",
      },
      "E-commerce": {
        primary: "#FF6B6B",
        secondary: "#4ECDC4",
        rationale:
          "Red stimulates urgency and purchases. Teal provides balance and trust.",
      },
      Fitness: {
        primary: "#2ECC71",
        secondary: "#E74C3C",
        rationale:
          "Green represents vitality and health. Red-orange adds energy and motivation.",
      },
      Finance: {
        primary: "#1E3A8A",
        secondary: "#10B981",
        rationale:
          "Navy blue signals trust and authority. Green represents growth and prosperity.",
      },
      "Real Estate": {
        primary: "#374151",
        secondary: "#F59E0B",
        rationale:
          "Charcoal gray conveys luxury and sophistication. Gold accent adds premium feel.",
      },
      Education: {
        primary: "#7C3AED",
        secondary: "#F59E0B",
        rationale:
          "Purple stimulates creativity and wisdom. Yellow encourages optimism and learning.",
      },
      Healthcare: {
        primary: "#0EA5E9",
        secondary: "#14B8A6",
        rationale:
          "Sky blue instills calm and trust. Teal represents healing and care.",
      },
      "Food & Beverage": {
        primary: "#DC2626",
        secondary: "#F59E0B",
        rationale: "Red stimulates appetite. Amber adds warmth and comfort.",
      },
      Technology: {
        primary: "#6366F1",
        secondary: "#EC4899",
        rationale:
          "Indigo represents innovation. Pink accent adds modern, creative edge.",
      },
      Creative: {
        primary: "#8B5CF6",
        secondary: "#F97316",
        rationale:
          "Purple inspires creativity. Orange adds enthusiasm and energy.",
      },
    };

    const colors = nicheColorMap[niche] || {
      primary: "#4A5568",
      secondary: "#ED8936",
      rationale:
        "Balanced gray-blue for professionalism with orange accent for warmth.",
    };

    // Adjust based on descriptors
    const descriptorModifiers: Record<string, Partial<typeof colors>> = {
      bold: { secondary: "#E11D48" },
      minimalist: { primary: "#FAFAFA" },
      luxurious: { primary: "#1F2937", secondary: "#D97706" },
      playful: { primary: "#EC4899", secondary: "#FBBF24" },
      professional: { primary: "#1E40AF", secondary: "#F9FAFB" },
      warm: { secondary: "#F97316" },
      cool: { primary: "#0369A1" },
      vibrant: { secondary: "#EF4444" },
    };

    let finalColors = { ...colors };
    descriptors.forEach((desc) => {
      const modifier = descriptorModifiers[desc.toLowerCase()];
      if (modifier) {
        finalColors = { ...finalColors, ...modifier };
      }
    });

    return {
      primaryColor: finalColors.primary,
      secondaryColor: finalColors.secondary,
      neutralColor: "#F5F5F5",
      accentColor: "#333333",
      rationale: `${finalColors.rationale} These colors align with ${descriptors.join(", ")} personality for ${targetAudience}.`,
    };
  },
});

export default colorPsychologyTool;
