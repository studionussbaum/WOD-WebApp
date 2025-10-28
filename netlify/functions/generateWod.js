import { GoogleGenerativeAI } from "@google/generative-ai";

export async function handler(event) {
  try {
    const { goal, equipment, duration, focus } = JSON.parse(event.body);

    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a CrossFit coach. Create a workout based on:
      Goal: ${goal}
      Equipment: ${equipment.join(", ")}
      Duration: ${duration} minutes
      Focus: ${focus.join(", ")}
    `;

    const result = await model.generateContent(prompt);
    return {
      statusCode: 200,
      body: JSON.stringify({ text: result.response.text() }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
