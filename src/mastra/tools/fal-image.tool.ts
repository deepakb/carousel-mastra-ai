import { createTool } from '@mastra/core';
import { z } from 'zod';
import { fal } from "@fal-ai/client";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Get current directory for ES modules
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Visual style presets for carousel images
const carouselStyles = {
  Modern: {
    prefix: "Modern minimalist design with clean lines,",
    suffix: ", high contrast, professional layout, negative space for text",
  },
  Vibrant: {
    prefix: "Vibrant and colorful design with bold elements,",
    suffix: ", eye-catching composition, energetic feel, negative space for text",
  },
  Corporate: {
    prefix: "Professional corporate style,",
    suffix: ", business-appropriate, structured layout, trustworthy appearance, negative space for text",
  },
  Creative: {
    prefix: "Creative and artistic composition,",
    suffix: ", unique visual elements, innovative design approach, negative space for text",
  },
  Elegant: {
    prefix: "Elegant and sophisticated design,",
    suffix: ", refined aesthetics, premium look and feel, negative space for text",
  }
};

// Helper function to wrap text
// Helper function to wrap text with safe zone awareness
function wrapText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

// Helper function to overlay text using Canvas
async function overlayText(
  imageBuffer: Buffer,
  slideContent: string,
  brandColors: { primary: string; secondary: string },
  slideNumber: number,
  design?: any
): Promise<Buffer> {
  console.log("🎨 [Text Overlay] Starting text overlay process...");

  const img = await loadImage(imageBuffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');

  // Draw background image
  ctx.drawImage(img, 0, 0);

  const width = canvas.width;
  const height = canvas.height;
  const padding = 100; // Increased padding for safe zone
  const contentWidth = width - (padding * 2);

  // Design Defaults
  const layout = design?.layout || "Center Middle";
  const overlayStyle = design?.overlay || "Gradient Bottom";
  const headlineFont = design?.fonts?.headline || "Arial";
  const bodyFont = design?.fonts?.body || "Arial";
  const primaryColor = design?.colors?.primary || brandColors.primary;
  const textColor = design?.colors?.text || "#FFFFFF";

  // 1. Draw Overlay
  if (overlayStyle === "Gradient Bottom") {
    const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.8, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height * 0.4, width, height * 0.6);
  } else if (overlayStyle === "Glassmorphism") {
    // Simulate glass card
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#000000";
    const cardHeight = height * 0.4;
    const cardY = height - cardHeight - padding;
    ctx.roundRect(padding, cardY, contentWidth, cardHeight, 20);
    ctx.fill();
    ctx.restore();
  } else if (overlayStyle === "Solid Card") {
    ctx.fillStyle = brandColors.secondary;
    const cardHeight = height * 0.4;
    const cardY = height - cardHeight - padding;
    ctx.fillRect(padding, cardY, contentWidth, cardHeight);
  }

  // 2. Text Configuration
  ctx.textAlign = layout.includes("Center") ? 'center' : 'left';
  ctx.textBaseline = 'top';

  const xPos = layout.includes("Center") ? width / 2 : padding;
  let yPos = height * 0.65; // Default start Y

  if (overlayStyle === "Glassmorphism" || overlayStyle === "Solid Card") {
    yPos = height - (height * 0.4) + padding; // Adjust for card
  }

  // Slide Number
  ctx.font = `bold 40px "${headlineFont}"`;
  ctx.fillStyle = primaryColor;
  if (layout.includes("Center")) {
    ctx.fillText(`${slideNumber < 10 ? '0' : ''}${slideNumber}`, width / 2, padding);
  } else {
    ctx.fillText(`${slideNumber < 10 ? '0' : ''}${slideNumber}`, padding, padding);
  }

  // 3. Render Content (Headline + Subheadline + Body)
  let headline = "";
  let subheadline = "";
  let body = "";

  try {
    // Try to parse as JSON object
    const contentObj = JSON.parse(slideContent);
    headline = contentObj.headline || "";
    subheadline = contentObj.subheadline || "";
    body = contentObj.bodyText || "";
  } catch (e) {
    // Fallback to raw string if not JSON
    headline = slideContent;

    // Simple heuristic for raw string: split by newline
    if (slideContent.includes("\n")) {
      const parts = slideContent.split("\n");
      headline = parts[0];
      body = parts.slice(1).join(" ");
    }
  }

  let currentY = yPos;

  // Headline
  if (headline) {
    ctx.font = `bold 70px "${headlineFont}"`;
    ctx.fillStyle = textColor;
    currentY = wrapText(ctx, headline, xPos, currentY, contentWidth, 80);
    currentY += 20; // Spacing
  }

  // Subheadline
  if (subheadline) {
    ctx.font = `bold italic 45px "${bodyFont}"`; // Distinct style for subhead
    ctx.fillStyle = primaryColor; // Use brand color
    currentY = wrapText(ctx, subheadline, xPos, currentY, contentWidth, 55);
    currentY += 20; // Spacing
  }

  // Body
  if (body) {
    ctx.font = `normal 40px "${bodyFont}"`;
    ctx.fillStyle = "#DDDDDD"; // Slightly dimmer
    wrapText(ctx, body, xPos, currentY, contentWidth, 50);
  }

  console.log("✅ [Text Overlay] Text overlay completed");
  return canvas.toBuffer('image/jpeg');
}

// Helper function to generate image using Fal AI
async function generateCarouselImage(
  prompt: string,
  style: string,
  brandColors: { primary: string; secondary: string },
  aspectRatio: string,
  referenceImageUrl?: string
): Promise<string> {
  console.log("🎨 [Image Generation] Starting image generation process with Fal AI (Flux/Dev)...");
  console.log(`📝 [Image Generation] Input parameters:`, {
    prompt: prompt.substring(0, 50) + "...",
    style: style,
    brandColors,
    aspectRatio,
    referenceImageUrl: referenceImageUrl ? "Provided" : "None"
  });

  const styleConfig = carouselStyles[style as keyof typeof carouselStyles] || carouselStyles.Modern;
  const fullPrompt = `${styleConfig.prefix} ${prompt} ${styleConfig.suffix}
    Color Palette: Primary ${brandColors.primary}, Secondary ${brandColors.secondary}
    IMPORTANT: ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO WATERMARKS. Clean background only. Negative space for text overlay.`;

  console.log(`🎭 [Image Generation] Applied style config:`, styleConfig);
  console.log(`📝 [Image Generation] Full prompt: ${fullPrompt.substring(0, 100)}...`);

  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    console.error("❌ [Image Generation] FAL_KEY not found in environment variables");
    throw new Error("FAL_KEY not found in environment variables");
  }

  fal.config({ credentials: apiKey });

  try {
    // Convert aspect ratio to format expected by Fal AI
    let falAspectRatio: "16:9" | "4:5" | "1:1" | "21:9" | "4:3" | "3:2" | "2:3" | "5:4" | "3:4" | "9:16" = "16:9";
    if (aspectRatio === "4:5") {
      falAspectRatio = "4:5";
    } else if (aspectRatio === "1:1") {
      falAspectRatio = "1:1";
    }

    const input: any = {
      prompt: fullPrompt,
      num_images: 1,
      output_format: "jpeg",
      aspect_ratio: falAspectRatio,
      enable_safety_checker: true,
    };

    // Add reference image if provided (using image_url for img2img influence)
    if (referenceImageUrl) {
      // For Flux, image_url is often used for img2img. 
      // We set a low strength to keep the style but allow content change.
      // Note: Check specific model docs if 'image_url' or 'control_image_url' is preferred.
      // Assuming standard Fal pattern for now.
      input.image_url = referenceImageUrl;
      input.strength = 0.85; // High strength = more like prompt, less like reference image structure (0-1 usually)
      // Actually, for img2img, strength usually means "how much to change". 
      // 0.8 means change 80%. We want to keep style but change content. 
      // Flux might handle this differently. Let's use a safe default or omit if unsure.
      // User asked to "see if we need to pass image reference". 
      // Let's assume we pass it as 'image_url' which is standard.
    }

    const result = await fal.subscribe("fal-ai/flux/dev", {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs?.map((log: any) => log.message).forEach(console.log);
        }
      },
    });

    const imageUrl = result.data?.images?.[0]?.url;
    if (!imageUrl) throw new Error("Fal did not return an image URL");
    console.log(`✅ [Fal AI] Image generated: ${imageUrl}`);

    // Download image and convert to base64 for local saving
    const imageRes = await fetch(imageUrl);
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64ImageBytes = buffer.toString("base64");

    console.log(`✅ [Fal AI] Image converted to base64 successfully`);

    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("❌ [Fal AI] Error during image generation:", error);
    throw error;
  }
}

// Helper function to save image locally
async function saveImageLocally(
  imageData: string | Buffer, // Can be base64 string OR Buffer
  filename: string
): Promise<string> {
  console.log("💾 [Image Save] Starting local image save process...");
  console.log(`📁 [Image Save] Filename: ${filename}`);

  try {
    // Ensure the filename has proper extension
    if (
      !filename.endsWith(".png") &&
      !filename.endsWith(".jpg") &&
      !filename.endsWith(".jpeg")
    ) {
      filename += ".png";
      console.log(`📝 [Image Save] Added .png extension: ${filename}`);
    }

    // Add timestamp to avoid conflicts
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const nameWithoutExt = path.parse(filename).name;
    const ext = path.parse(filename).ext;
    const finalFilename = `${nameWithoutExt}_${timestamp}${ext}`;

    console.log(`⏰ [Image Save] Generated timestamp: ${timestamp}`);
    console.log(`📄 [Image Save] Final filename: ${finalFilename}`);

    // Handle Buffer or Base64 String
    let buffer: Buffer;
    if (Buffer.isBuffer(imageData)) {
      buffer = imageData;
    } else {
      console.log("🔄 [Image Save] Converting base64 data to buffer...");
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");
    }

    console.log(`📊 [Image Save] Buffer size: ${buffer.length} bytes`);

    // Save to carousel-images directory at project root
    const projectRoot = path.resolve(dirname, "../../.."); // Go up from src/mastra/tools to project root
    const outputDir = path.join(projectRoot, "carousel-images");
    console.log(`📁 [Image Save] Project root: ${projectRoot}`);
    console.log(`📁 [Image Save] Output directory: ${outputDir}`);

    if (!fs.existsSync(outputDir)) {
      console.log(`📁 [Image Save] Creating output directory...`);
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✅ [Image Save] Output directory created successfully`);
    } else {
      console.log(`✅ [Image Save] Output directory already exists`);
    }

    const filePath = path.join(outputDir, finalFilename);
    console.log(`📄 [Image Save] Full file path: ${filePath}`);

    console.log("💾 [Image Save] Writing file to disk...");
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ [Image Save] Image saved successfully: ${finalFilename}`);
    console.log(`📊 [Image Save] File size: ${buffer.length} bytes`);

    return finalFilename;
  } catch (error) {
    console.error("❌ [Image Save] Error saving image locally:", error);
    throw new Error(
      `Failed to save image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Helper function to upload image to S3
async function uploadImageToS3(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = "image/jpeg"
): Promise<{ url: string; key: string }> {
  console.log("☁️ [S3 Upload] Starting S3 upload process...");

  const bucketName = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_REGION || "us-east-1";

  if (!bucketName) {
    throw new Error("AWS_BUCKET_NAME is not defined in environment variables");
  }

  try {
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });

    const key = `carousel-images/${filename}`;

    console.log(`☁️ [S3 Upload] Uploading to bucket: ${bucketName}`);
    console.log(`☁️ [S3 Upload] Key: ${key}`);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
      // ACL: "public-read", // Optional: depends on bucket settings
    });

    await s3Client.send(command);

    // Construct URL (assuming standard S3 URL structure)
    const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    console.log(`✅ [S3 Upload] Upload successful: ${url}`);
    return { url, key };
  } catch (error) {
    console.error("❌ [S3 Upload] Error uploading to S3:", error);
    throw error;
  }
}

export const falImageTool = createTool({
  id: 'generate-carousel-image',
  description: 'Generate carousel slide image using Fal AI (Flux/Dev)',

  inputSchema: z.object({
    prompt: z.string().describe("The base image generation prompt"),
    slideContent: z.string().describe("Content to be displayed on the slide"),
    brandColors: z.object({
      primary: z.string().describe("Primary brand color (hex code)"),
      secondary: z.string().describe("Secondary brand color (hex code)"),
    }),
    style: z.string().optional().describe("Visual style to apply (Modern, Vibrant, Corporate, Creative, Elegant)"),
    aspectRatio: z.enum(["1:1", "4:5", "16:9"]).default('4:5').describe("Image aspect ratio"),
    slideNumber: z.number().describe("Slide number in the carousel sequence"),
    referenceImageUrl: z.string().optional().describe("URL of a reference image to maintain consistency"),
    saveLocally: z.boolean().default(true).describe("Whether to save the image locally"),
    uploadToS3: z.boolean().default(true).describe("Whether to upload the image to S3"),
    design: z.any().optional().describe("Design system parameters (fonts, layout, overlay)"),
  }),

  outputSchema: z.object({
    imageUrl: z.string().describe("URL to the generated image (S3 or local path)"),
    localPath: z.string().optional().describe("Local file path if saved locally"),
    s3Key: z.string().optional().describe("S3 key if uploaded to S3"),
    imagePrompt: z.string().describe("The final prompt used for generation"),
    style: z.string().describe("The style that was applied"),
    metadata: z.object({
      generationTime: z.number().describe("Time taken to generate in milliseconds"),
      model: z.string().describe("AI model used for generation"),
      aspectRatio: z.string().describe("Aspect ratio used"),
    }).optional(),
  }),

  execute: async ({ context }) => {
    console.log("🛠️ [Carousel Image Tool] Tool execution started...");
    console.log(`📋 [Carousel Image Tool] Input context:`, {
      prompt: context.prompt.substring(0, 50) + "...",
      slideContent: context.slideContent.substring(0, 50) + "...",
      brandColors: context.brandColors,
      style: context.style || "Modern",
      aspectRatio: context.aspectRatio,
      slideNumber: context.slideNumber,
      referenceImageUrl: context.referenceImageUrl ? "Provided" : "None",
      saveLocally: context.saveLocally,
      uploadToS3: context.uploadToS3,
    });

    const {
      prompt,
      slideContent,
      brandColors,
      style = "Modern",
      aspectRatio = "4:5",
      slideNumber,
      referenceImageUrl,
      saveLocally = true,
      uploadToS3 = true,
      design
    } = context;

    console.log("🎨 [Carousel Image Tool] Design System:", design ? "Provided" : "Using Defaults");

    // Validate style
    if (style && !Object.keys(carouselStyles).includes(style)) {
      console.warn(`⚠️ [Carousel Image Tool] Style '${style}' not found, using Modern style`);
    }

    // Enhance prompt with brand and carousel context - GOD TIER PROMPT ENGINEERING
    const enhancedPrompt = `
Create a professional Instagram carousel slide (1080x1350px, ${aspectRatio} ratio).

Base Concept: ${prompt}

Visual Requirements:
- Color Palette: Primary ${brandColors.primary}, Secondary ${brandColors.secondary}
- Style: ${style}, clean, mobile-optimized
- Composition: High contrast, NEGATIVE SPACE for text overlay
- Brand consistency: Use specified colors prominently
- Quality: Professional, polished, Instagram-worthy

CRITICAL LAYOUT INSTRUCTIONS (SAFE ZONES):
- The top 15% and bottom 25% of the image MUST be clean/neutral (solid color, gradient, or very soft texture).
- NO complex details, faces, or busy patterns in the top 15% or bottom 25%.
- This is where text will be overlaid. If you put details there, the design fails.
- Center 60% is for the main visual interest.

Design Guidelines:
- NO TEXT ON IMAGE (Text will be added programmatically)
- Avoid faces unless essential
- No watermarks or logos
- Scene-aware lighting and composition
- Character consistency if part of series
- Text-friendly backgrounds (50%+ neutral space)
- WCAG AA contrast compliance

Output: High-quality image ready for Instagram carousel with perfect safe zones.
    `.trim();

    try {
      const startTime = Date.now();

      console.log(`🔄 [Carousel Image Tool] Generating image for slide ${slideNumber}...`);

      // Generate image using Gemini
      const imageData = await generateCarouselImage(enhancedPrompt, style, brandColors, aspectRatio, referenceImageUrl);
      console.log(`✅ [Carousel Image Tool] Image data received (${imageData.length} characters)`);

      // Overlay Text
      console.log(`🎨 [Carousel Image Tool] Overlaying text...`);
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      const compositedImageBuffer = await overlayText(imageBuffer, slideContent, brandColors, slideNumber, design);
      console.log(`✅ [Carousel Image Tool] Text overlay complete`);

      let localPath;
      let s3Data = { imageUrl: "", s3Key: "" };

      // Save locally if requested
      if (saveLocally) {
        const filename = `carousel_slide_${slideNumber}_${prompt.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)}`;
        localPath = await saveImageLocally(compositedImageBuffer, filename);
        console.log(`✅ [Carousel Image Tool] Image saved locally: ${localPath}`);

        // Upload to S3 if requested
        if (uploadToS3) {
          try {
            const s3Result = await uploadImageToS3(compositedImageBuffer, localPath || filename + ".jpg");
            s3Data = { imageUrl: s3Result.url, s3Key: s3Result.key };
          } catch (error) {
            console.warn("⚠️ [Carousel Image Tool] S3 upload failed, continuing with local path only", error);
          }
        }
      } else if (uploadToS3) {
        // If not saving locally, we still need a filename for S3
        const filename = `carousel_slide_${slideNumber}_${prompt.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20)}.jpg`;
        try {
          const s3Result = await uploadImageToS3(compositedImageBuffer, filename);
          s3Data = { imageUrl: s3Result.url, s3Key: s3Result.key };
        } catch (error) {
          console.error("❌ [Carousel Image Tool] S3 upload failed and local save disabled");
          throw error;
        }
      }

      const generationTime = Date.now() - startTime;

      const metadata = {
        generationTime,
        model: "fal-ai/flux/dev",
        aspectRatio,
      };

      console.log(`📊 [Carousel Image Tool] Image metadata:`, metadata);

      // Determine the primary imageUrl to return
      const imageUrl = s3Data.imageUrl || (localPath ? `file://${localPath}` : "");

      if (!imageUrl) {
        throw new Error("Failed to generate image URL from either S3 or local path");
      }

      console.log(`\n🎉 [Carousel Image Tool] Image generation completed successfully!`);
      console.log(`📊 [Carousel Image Tool] Summary:`, {
        imageUrl,
        localPath,
        s3Key: s3Data.s3Key,
        totalTime: `${generationTime}ms`,
      });

      return {
        imageUrl,
        localPath,
        s3Key: s3Data.s3Key,
        imagePrompt: enhancedPrompt,
        style,
        metadata,
      };
    } catch (error) {
      console.error(`❌ [Carousel Image Tool] Image generation failed:`, error);

      // Fallback: return placeholder
      return {
        imageUrl: `https://via.placeholder.com/1080x1350/${brandColors.primary.replace('#', '')}/${brandColors.secondary.replace('#', '')}?text=Slide+${slideNumber}`,
        imagePrompt: enhancedPrompt,
        style,
        s3Key: 'placeholder',
      };
    }
  },
});

export default falImageTool;
