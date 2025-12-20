import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
// We won't throw error immediately if missing to allow UI to load, but functionality will fail gracefully.
const ai = new GoogleGenAI({ apiKey });

export const polishNursingNote = async (text: string, type: 'D' | 'A' | 'R' | 'T'): Promise<string> => {
    if (!text || !apiKey) return text;
    try {
        const prompt = `You are an expert psychiatric nurse. Rewrite the following nursing note segment (Type: ${type}) to be professional, concise, clinically accurate, and objective. Maintain the original meaning but improve the phrasing to meet medical documentation standards in Traditional Chinese (Taiwan).
        
        Original Text:
        "${text}"
        
        Refined Text (Just the text):`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text?.trim() || text;
    } catch (error) {
        console.error("Gemini Polish Error:", error);
        return text;
    }
};

export const suggestNursingActions = async (focus: string, subjectiveData: string): Promise<string[]> => {
    if (!apiKey) return [];
    try {
        const prompt = `Given the nursing diagnosis/focus "${focus}" and the patient's subjective data/context "${subjectiveData}", list 3-5 specific, professional psychiatric nursing interventions (Actions). Return ONLY a JSON array of strings in Traditional Chinese.
        Example: ["主動傾聽病人感受", "評估自殺風險", "衛教藥物副作用"]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text?.trim();
        if (text) {
            return JSON.parse(text);
        }
        return [];
    } catch (error) {
        console.error("Gemini Suggest Error:", error);
        return [];
    }
};
