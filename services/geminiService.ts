import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { FloorplanFile, FurnitureItem, PaintColor } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getColorPaletteRecommendation = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Error getting color palette recommendation:", error);
    throw new Error("Failed to get color palette recommendation.");
  }
};

export const generateRoomRendering = async (prompt: string, floorplan?: FloorplanFile): Promise<string> => {
    try {
        const parts: any[] = [{ text: prompt }];

        if (floorplan) {
            parts.unshift({
                inlineData: {
                    data: floorplan.data,
                    mimeType: floorplan.mimeType,
                },
            });
        }
    
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: parts },
          config: {
              responseModalities: [Modality.IMAGE],
          },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              return part.inlineData.data;
            }
        }
        throw new Error("No image data found in the response.");
      } catch (error) {
        console.error("Error generating room rendering:", error);
        throw new Error("Failed to generate room rendering.");
      }
};

export const identifyAndFindFurniture = async (rendering: string, roomType: string, styles: string[], stores: string[]): Promise<{ furniture: FurnitureItem[], paints: PaintColor[], sources: any[] }> => {
    try {
        const storeList = stores.length > 0 ? stores.join(', ') : 'popular online stores (e.g., Wayfair, IKEA, West Elm, Amazon)';
        const prompt = `You are a virtual interior designer with access to Google Search. Your primary goal is accuracy and providing valid, real-world product information. Analyze this image of a ${roomType} with a ${styles.join(', ')} design style. Your task is to identify furniture/decor and wall paint colors, finding real, currently purchasable products.

Return ONLY a single, valid JSON object with two keys: "furniture" and "paints". Do not include any other text or markdown formatting.

1.  **furniture**: An array of up to 8 distinct items. For each item:
    *   Use your search tool to find a real, in-stock, purchasable version from these specific stores: ${storeList}.
    *   **CRITICAL: The 'purchaseUrl' must be a direct, valid, and active HTTPS link to the specific product's detail page. Before including a URL, you MUST verify that it leads to a 200 OK status page for a single product. Do not provide links to homepages, category pages, search results, or out-of-stock items.**
    *   Provide: 'name', 'description', 'store', 'price', 'purchaseUrl', 'thumbnailUrl', and 'boundingBox' (normalized coordinates).

2.  **paints**: An array of up to 3 dominant wall colors. For each color:
    *   Use your search tool to find a matching real-world paint from a major brand (e.g., Sherwin-Williams, Benjamin Moore, Farrow & Ball).
    *   Provide: 'name' (e.g., "Sage Green"), 'hex' (e.g., "#8FBC8F"), 'brand' (e.g., "Sherwin-Williams"), and 'brandColorName' (e.g., "Clary Sage SW 6178").`;

        const imagePart = {
            inlineData: {
                data: rendering,
                mimeType: 'image/png',
            },
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                tools: [{googleSearch: {}}],
            },
        });
        
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const jsonString = response.text.trim();
        const cleanedJsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
        const result: { furniture: FurnitureItem[], paints: PaintColor[] } = JSON.parse(cleanedJsonString);
        return { ...result, sources };

    } catch (error) {
        console.error("Error identifying furniture:", error);
        throw new Error("Failed to identify and find furniture. The AI model may have been unable to process the request.");
    }
};

export const findSimilarFurniture = async (item: FurnitureItem): Promise<{ similarItems: FurnitureItem[], sources: any[] }> => {
    try {
        const prompt = `You are an expert product sourcer with access to Google Search. Based on the following furniture item, find 3 to 5 similar, alternative products that are currently available for purchase online.

Original Item:
- Name: ${item.name}
- Description: ${item.description}
- Store: ${item.store}
- Price: ${item.price}

Return ONLY a single, valid JSON array of objects. Do not include any other text or markdown formatting.

For each alternative, use your search tool to find and provide:
1. 'name': The exact product name.
2. 'description': A brief, one-sentence description.
3. 'store': The online store name.
4. 'price': The current price as a string (e.g., "$499.99").
5. 'purchaseUrl': **CRITICAL: This must be a verified, direct, and active HTTPS link to the specific product's detail page. You MUST verify the URL is live and points to a single product page, not a list or search result. Do NOT provide links to homepages, category pages, or out-of-stock items.**
6. 'thumbnailUrl': A direct HTTPS link to a product image file (e.g., .jpg, .png, .webp).

The alternatives should be similar in style and function but can vary in price or material.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{googleSearch: {}}],
            },
        });
        
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const jsonString = response.text.trim();
        const cleanedJsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
        const similarItems: FurnitureItem[] = JSON.parse(cleanedJsonString);
        return { similarItems, sources };

// FIX: Added curly braces to the catch block to fix syntax error.
    } catch (error) {
        console.error("Error finding similar furniture:", error);
        throw new Error("Failed to find similar furniture.");
    }
};