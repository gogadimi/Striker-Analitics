import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResponse } from "../types";

// Define the schema matching the "Striker Analytics" JSON requirements
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: { type: Type.STRING, enum: ["success", "error"] },
    action_detected: { type: Type.STRING },
    form_score: { type: Type.INTEGER, description: "Score from 1-10" },
    score_label: { type: Type.STRING },
    score_color: { type: Type.STRING, enum: ["green", "yellow", "red"] },
    
    technical_data: {
      type: Type.OBJECT,
      properties: {
        torso_angle: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.INTEGER },
            target: { type: Type.INTEGER },
            status: { type: Type.STRING }
          },
          required: ["value", "target", "status"]
        },
        plant_foot_offset: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.INTEGER },
            target: { type: Type.INTEGER },
            status: { type: Type.STRING }
          },
          required: ["value", "target", "status"]
        }
      },
      required: ["torso_angle", "plant_foot_offset"]
    },

    key_strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },

    areas_for_improvement: {
      type: Type.ARRAY,
      items: { 
        type: Type.OBJECT,
        properties: {
          issue: { type: Type.STRING },
          drill: { type: Type.STRING },
          instructions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }
          }
        },
        required: ["issue", "drill", "instructions"]
      }
    },

    coaching_tips: {
      type: Type.OBJECT,
      properties: {
        en: { type: Type.STRING },
        mk: { type: Type.STRING },
        es: { type: Type.STRING },
      },
      required: ["en", "mk", "es"],
    },
  },
  required: ["status"], // Only status is strictly required to handle error cases
};

const SYSTEM_INSTRUCTION = `
**ROLE:**
You are the "Striker Analytics AI," an expert AI specialized in football (soccer) biomechanics and youth player development. Your capabilities include computer vision analysis, error detection, and multilingual coaching communication.

**OBJECTIVE:**
Analyze the user-uploaded video to evaluate the player's technique (specifically the "Instep Drive Shot"). You must extract quantitative biomechanical data, calculate a performance score, and generate encouraging, actionable feedback in three languages: English (en), Macedonian (mk), and Spanish (es).

**ANALYSIS PROTOCOL (The "Instep Drive" Standard):**
Compare the user's form against these Pro Standards:
1.  **Plant Foot:** Must be placed *beside* the ball (not behind).
    * *Ideal:* 5-10cm lateral distance, 0cm longitudinal offset (aligned with ball).
    * *Error:* Foot placed behind the ball causes loss of power and control.
2.  **Torso Lean:** Upper body must be slightly *over* the ball at contact.
    * *Ideal:* 90-100 degrees relative to the ground (slight forward hunch).
    * *Error:* Leaning back (>110 deg) causes the ball to fly high/over the bar.
3.  **Knee Over Ball:** The knee of the kicking leg should be over the ball at contact.
4.  **Follow Through:** Must land on the kicking foot (forward momentum).

**SCORING RUBRIC (1-10):**
* **8-10 (Excellent):** Minor adjustments needed. Good power/accuracy likely.
* **5-7 (Good/Average):** One clear technical error (e.g., leaning back), but good contact.
* **1-4 (Needs Improvement):** Critical biomechanical flaws (e.g., plant foot way behind, leaning far back).

**OUTPUT FORMAT:**
Return a JSON object matching the schema.
- If the video is unclear or not a football drill, return { "status": "error" }.
- If valid, return { "status": "success", ... } with all analysis fields.

**COACHING TONE GUIDELINES:**
* **Structure:** "Sandwich Method" -> Praise the effort -> Explain the specific error (referencing the data) -> Give a clear fix.
* **Macedonian Translation:** Use natural terms. (e.g., instead of 'Support Leg', use 'Стајна нога'; instead of 'Shoot', use 'Шут').
* **Spanish Translation:** Use natural terms (e.g., 'Pie de apoyo', 'Cuerpo hacia atrás').
`;

export const analyzeVideo = async (file: File): Promise<AnalysisResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await fileToGenerativePart(file);
  const model = "gemini-2.5-flash"; 
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          },
          {
            text: "Analyze this video according to the Striker Analytics protocols.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsedResponse = JSON.parse(text) as AnalysisResponse;
    return parsedResponse;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

async function fileToGenerativePart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.error) {
        reject(reader.error);
        return;
      }
      const result = reader.result;
      if (!result || typeof result !== 'string') {
        reject(new Error("Failed to read file"));
        return;
      }
      const parts = result.split(',');
      resolve(parts[1]);
    };
    reader.readAsDataURL(file);
  });
}