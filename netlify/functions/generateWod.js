import OpenAI from "openai";

export async function handler(event) {
  try {
    const { goal, equipment, duration, focus } = JSON.parse(event.body);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are a CrossFit coach. Create a workout (WOD) based on:
Goal: ${goal}
Equipment: ${equipment.join(", ")}
Duration: ${duration} minutes
Focus areas: ${focus.join(", ")}

Output a structured JSON like this:
{
  "name": "Workout Title",
  "format": "AMRAP / For Time / EMOM",
  "duration": "10 minutes",
  "description": "Short description",
  "rx": "RX standards",
  "intermediate": "Scaled standards",
  "cooldown": "Short cool down routine"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0].message.content;
    return {
      statusCode: 200,
      body: JSON.stringify({ text }),
    };
  } catch (error) {
    console.error("OpenAI error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
