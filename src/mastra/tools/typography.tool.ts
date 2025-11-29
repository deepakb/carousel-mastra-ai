import { createTool } from "@mastra/core";
import { z } from "zod";

export const typographyTool = createTool({
  id: "recommend-typography",
  description: "Recommend font pairs based on brand personality",

  inputSchema: z.object({
    descriptors: z.array(z.string()),
    platform: z.literal("instagram").default("instagram"),
  }),

  outputSchema: z.object({
    headlineFont: z.string(),
    bodyFont: z.string(),
    reasoning: z.string(),
  }),

  execute: async ({ context }) => {
    const { descriptors } = context;

    // Font recommendation based on personality - GOD TIER SELECTION
    const fontPairs: Record<
      string,
      { headline: string; body: string; reasoning: string }
    > = {
      bold: {
        headline: "Inter Bold",
        body: "Inter Regular",
        reasoning:
          "Inter is a modern, highly legible sans-serif with strong weight contrast. Perfect for high-impact, direct messaging.",
      },
      modern: {
        headline: "Poppins Bold",
        body: "Poppins Regular",
        reasoning:
          "Poppins offers geometric precision with excellent mobile readability. It feels clean, contemporary, and tech-forward.",
      },
      elegant: {
        headline: "Playfair Display Bold",
        body: "Lato Regular",
        reasoning:
          "Playfair serif headlines paired with clean sans-serif body for sophistication. Ideal for luxury, fashion, or lifestyle content.",
      },
      playful: {
        headline: "Fredoka Bold",
        body: "Nunito Regular",
        reasoning:
          "Fredoka has friendly rounded forms. Nunito complements with soft readability. Great for engagement and relatable content.",
      },
      professional: {
        headline: "Montserrat Bold",
        body: "Open Sans Regular",
        reasoning:
          "Montserrat conveys authority and trust. Open Sans ensures clarity at all sizes. The standard for business and educational content.",
      },
      minimalist: {
        headline: "Helvetica Neue Bold",
        body: "Helvetica Neue Regular",
        reasoning: "Helvetica is timeless, neutral, and maximizes readability. It lets the content speak for itself without distraction.",
      },
      luxurious: {
        headline: "Cormorant Garamond Bold",
        body: "Avenir Regular",
        reasoning: "Cormorant offers a premium, editorial feel. Avenir provides a clean, geometric counterpoint for readability.",
      },
      warm: {
        headline: "Quicksand Bold",
        body: "Quicksand Regular",
        reasoning:
          "Rounded, friendly letterforms create an approachable, warm tone. Excellent for wellness, personal stories, and community building.",
      },
      trustworthy: {
        headline: "Roboto Bold",
        body: "Roboto Regular",
        reasoning:
          "Roboto is neutral, dependable, and widely recognized. It builds subconscious trust and familiarity.",
      },
      creative: {
        headline: "Archivo Black",
        body: "Work Sans Regular",
        reasoning: "Bold, expressive headlines with versatile sans-serif body. Stands out in the feed and commands attention.",
      },
      inspirational: {
        headline: "Oswald Bold",
        body: "Merriweather Regular",
        reasoning: "Oswald is strong and impactful for quotes. Merriweather adds a touch of classic elegance for longer text.",
      }
    };

    // Select primary descriptor
    const primaryDescriptor = descriptors[0]?.toLowerCase() || "modern";
    const fonts = fontPairs[primaryDescriptor] || fontPairs.modern;

    return {
      headlineFont: fonts.headline,
      bodyFont: fonts.body,
      reasoning: `${fonts.reasoning} Optimized for Instagram carousel viewing at 16pt+ minimum.`,
    };
  },
});

export default typographyTool;
