


import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { FloorplanFile, FurnitureItem } from '../types';

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

export const identifyAndFindFurniture = async (rendering: string, roomType: string, styles: string[], stores: string[]): Promise<FurnitureItem[]> => {
    try {
        const storeList = stores.length > 0 ? stores.join(', ') : 'popular online stores (e.g., Wayfair, IKEA, West Elm, Amazon)';
        const prompt = `Your primary task is to find direct product links for furniture and decor in this image of a ${roomType} with a ${styles.join(', ')} design style. Identify up to 8 distinct items and find real, purchasable versions from these specific stores: ${storeList}.

**CRITICAL INSTRUCTION: URL ACCURACY IS THE TOP PRIORITY.**
For each item, you MUST provide a direct, specific, and valid HTTPS link to the product's detail page.
- **ABSOLUTELY NO** homepages (e.g., 'https://www.ikea.com').
- **ABSOLUTELY NO** category pages (e.g., 'https://www.wayfair.com/furniture/cat/sofas-c123.html').
- **ABSOLUTELY NO** search results (e.g., 'https://www.amazon.com/s?k=blue+chair').

A good URL looks like: 'https://www.ikea.com/us/en/p/product-name-12345/'.
A bad URL looks like: 'https://www.ikea.com/'.

If you cannot find a direct product page URL for an item, **DO NOT INCLUDE THAT ITEM** in your response. It is better to return fewer items with correct URLs than more items with incorrect ones.

For each item you successfully find a valid link for, provide:
1.  **Product Name:** The exact name of the product.
2.  **Description:** A brief, one-sentence description.
3.  **Store:** The name of the online store.
4.  **Price:** The approximate price as a string (e.g., "$499.99").
5.  **Purchase URL:** The direct product page URL as described above.
6.  **Bounding Box:** The item's location in the image, using normalized coordinates (0.0 to 1.0) for x_min, y_min, x_max, and y_max.
7.  **Thumbnail URL:** A direct HTTPS URL to a product image. If you cannot find one, do not include the item.`;

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
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Product name" },
                            description: { type: Type.STRING, description: "A brief one-sentence description of the product." },
                            store: { type: Type.STRING, description: "Online store name (e.g., Wayfair, IKEA)." },
                            price: { type: Type.STRING, description: "Approximate price of the item as a string, including currency." },
                            purchaseUrl: { 
                                type: Type.STRING, 
                                description: "A valid, direct HTTPS URL to the product's specific detail page. MUST NOT be a homepage, category page, or search results page. It must link directly to a single product." 
                            },
                            thumbnailUrl: {
                                type: Type.STRING,
                                description: "A direct HTTPS URL to a product image for the item."
                            },
                            boundingBox: {
                                type: Type.OBJECT,
                                description: "Normalized coordinates for the item's location.",
                                properties: {
                                    x_min: { type: Type.NUMBER },
                                    y_min: { type: Type.NUMBER },
                                    x_max: { type: Type.NUMBER },
                                    y_max: { type: Type.NUMBER },
                                },
                                required: ['x_min', 'y_min', 'x_max', 'y_max']
                            },
                        },
                        required: ['name', 'description', 'store', 'price', 'purchaseUrl', 'boundingBox', 'thumbnailUrl'],
                    },
                },
            },
        });
        
        const jsonString = response.text.trim();
        const cleanedJsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
        const furnitureItems: FurnitureItem[] = JSON.parse(cleanedJsonString);
        return furnitureItems;

    } catch (error) {
        console.error("Error identifying furniture:", error);
        throw new Error("Failed to identify and find furniture. The AI model may have been unable to process the request.");
    }
};

export const findSimilarFurniture = async (item: FurnitureItem): Promise<FurnitureItem[]> => {
    try {
        const prompt = `Based on the following furniture item, find 3 to 5 similar, alternative products that are currently available for purchase from popular online stores (like Wayfair, West Elm, Article, IKEA, Amazon, etc.).

Original Item:
- Name: ${item.name}
- Description: ${item.description}
- Store: ${item.store}
- Price: ${item.price}

For each alternative, you MUST provide:
1.  **Product Name:** The exact name of the product.
2.  **Description:** A brief, one-sentence description highlighting what makes it similar or different.
3.  **Store:** The name of the online store.
4.  **Price:** The approximate price as a string (e.g., "$499.99").
5.  **Purchase URL:** A direct, specific, and valid HTTPS link to the product's own detail page. **This URL must lead directly to the product, NOT to a homepage or category page.**
6.  **Thumbnail URL:** A direct HTTPS URL to a product image.

The alternatives should be similar in style (e.g., Mid-Century Modern, Farmhouse) and function, but can vary in price or material. Do not suggest the exact same product from a different store.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Product name" },
                            description: { type: Type.STRING, description: "A brief one-sentence description of the product." },
                            store: { type: Type.STRING, description: "Online store name." },
                            price: { type: Type.STRING, description: "Approximate price as a string." },
                            purchaseUrl: { 
                                type: Type.STRING, 
                                description: "A valid, direct HTTPS URL to the product's specific detail page." 
                            },
                            thumbnailUrl: { 
                                type: Type.STRING, 
                                description: "A direct HTTPS URL to a product image." 
                            },
                        },
                        required: ['name', 'description', 'store', 'price', 'purchaseUrl', 'thumbnailUrl'],
                    },
                },
            },
        });
        
        const jsonString = response.text.trim();
        const cleanedJsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
        const similarItems: FurnitureItem[] = JSON.parse(cleanedJsonString);
        return similarItems;

    } catch (error) {
        console.error("Error finding similar furniture:", error);
        throw new Error("Failed to find similar furniture.");
    }
};

export const changeWallColor = async (base64Image: string, newColor: string): Promise<string> => {
    try {
        const prompt = `Change the color of the walls in this image to "${newColor}". Do not change the furniture, layout, lighting, windows, decor, or any other elements of the room. The architectural structure must remain identical. Only modify the wall color.`;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: 'image/png',
            },
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              return part.inlineData.data;
            }
        }
        throw new Error("No image data found in the recolored response.");
    } catch (error) {
        console.error("Error changing wall color:", error);
        throw new Error("Failed to change the wall color. The AI may have been unable to process the request.");
    }
};
