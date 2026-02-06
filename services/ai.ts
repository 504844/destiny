import { GoogleGenAI, Type } from "@google/genai";
import { Track } from "../types";

// Initialize AI Client
// Note: In a production environment, this should ideally be proxied through a backend to protect the API key.
// For this demo, we assume the environment variable is injected by the bundler/runtime.
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

export interface AIAnalysisResult {
  djName: string;
  bio: string;
  vibeKeywords: string[];
  vibeScores: {
    energy: number;
    mood: number;
    popularity: number;
    era: number;
    vocals: number;
  };
}

export const analyzeUserTaste = async (username: string, tracks: Track[]): Promise<AIAnalysisResult | null> => {
  if (!apiKey) {
    console.warn("Gemini API Key is missing.");
    return null;
  }

  // Take the most recent 20 tracks to analyze
  const recentTracks = tracks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)
    .map(t => `${t.artists} - ${t.title}`)
    .join("\n");

  const prompt = `
    Analyze the musical taste of DJ "${username}" based on their last 20 song submissions:
    ${recentTracks}

    Task:
    1. Create a creative "DJ Persona Name" (e.g., "The Bass Wizard", "Indie Melancholic").
    2. Write a short, witty 2-sentence bio/roast about their specific taste.
    3. Extract 3-5 short vibe keywords (hashtags).
    4. Rate their taste on 5 axes (0-100):
       - Energy (0=Ambient/Chill, 100=Hard/Aggressive)
       - Mood (0=Dark/Sad, 100=Happy/Euphoric)
       - Popularity (0=Obscure, 100=Top 40)
       - Era (0=Old School, 100=Futuristic/Modern)
       - Vocals (0=Instrumental, 100=Lyrical/Pop structure)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            djName: { type: Type.STRING },
            bio: { type: Type.STRING },
            vibeKeywords: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            vibeScores: {
              type: Type.OBJECT,
              properties: {
                energy: { type: Type.NUMBER },
                mood: { type: Type.NUMBER },
                popularity: { type: Type.NUMBER },
                era: { type: Type.NUMBER },
                vocals: { type: Type.NUMBER }
              },
              required: ["energy", "mood", "popularity", "era", "vocals"]
            }
          },
          required: ["djName", "bio", "vibeKeywords", "vibeScores"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysisResult;
    }
  } catch (error) {
    console.error("AI Analysis Failed:", error);
  }

  return null;
};
