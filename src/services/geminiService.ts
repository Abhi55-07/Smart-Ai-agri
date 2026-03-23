import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export async function analyzePlantDisease(imageBase64: string, language: string = 'en') {
  if (!apiKey) {
    throw new Error("Gemini API key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const prompt = `
    You are an expert plant pathologist. 
    Analyze the provided image of a plant leaf.
    Provide a short and simple analysis in ${language} language so that even an uneducated person can understand.
    Use very simple words, like you are talking to a child.
    Include only these three sections:
    1. **Disease Name** 🦠: [Name of the disease]
    2. **Steps to Cure** 💊: [Simple, easy-to-follow steps to fix the problem]
    3. **How to Prevent Spreading** 🛡️: [Simple steps to stop it from spreading to other plants]
    
    Keep it clear, direct, and avoid complex scientific words.
    Use emojis to make it more visual.
    Format the output in Markdown.
  `;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: imageBase64.split(',')[1] || imageBase64,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, { text: prompt }] },
    });

    return response.text || "Could not analyze the image.";
  } catch (error) {
    console.error("Error analyzing plant disease:", error);
    return "Error occurred during analysis.";
  }
}
