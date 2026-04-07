import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function generateDayPlan(tasks: any[], userContext: string) {
  const model = "gemini-3.1-pro-preview";
  const prompt = `
    Based on the following tasks, generate a smart daily schedule.
    Tasks: ${JSON.stringify(tasks)}
    Context: ${userContext}
    
    Return a JSON array of objects with 'time', 'taskTitle', and 'duration' fields.
    Example: [{"time": "09:00", "taskTitle": "Study ML", "duration": "1h"}]
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              taskTitle: { type: Type.STRING },
              duration: { type: Type.STRING }
            },
            required: ["time", "taskTitle", "duration"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
}

export async function getSubtasks(taskTitle: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `Break down the task "${taskTitle}" into 5 actionable subtasks. Return as a JSON array of strings.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
}

export async function getGroqChat(message: string, history: any[]) {
  try {
    // Convert history to OpenAI-compatible format for Groq
    const groqHistory = history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a helpful productivity assistant. 
Your goal is to provide clear, actionable productivity advice.

Formatting Rules:
1. Use clean Markdown for structure (bullet points, bold text for emphasis).
2. Avoid excessive symbols or unnecessary conversational filler.
3. Keep responses concise and focused on the user's productivity.
4. If giving a tip, make it stand out with a clear heading or bold label.`,
          },
          ...groqHistory,
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Groq Chat Error:", error);
    return "Sorry, I'm having trouble connecting to the productivity engine.";
  }
}

export async function getProductivityTip(tasks: any[]) {
  const model = "gemini-3-flash-preview";
  const taskSummary = tasks.length > 0 
    ? `Current tasks: ${tasks.map(t => t.title).join(', ')}`
    : "No tasks currently.";
    
  const prompt = `
    Based on the following tasks, give me one quick, unique, and actionable productivity tip for today.
    ${taskSummary}
    
    Keep it under 20 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Stay focused and take small breaks!";
  } catch (error) {
    console.error("Gemini Tip Error:", error);
    return "Focus on your most important task first today.";
  }
}
