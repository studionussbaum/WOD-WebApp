const OpenAI = require("openai");

exports.handler = async (event) => {
  try {
    const { workouts } = JSON.parse(event.body || "{}");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!workouts || !Array.isArray(workouts)) {
      return { statusCode: 400, body: "Invalid workout data" };
    }

    const workoutHistory = workouts
      .map((w) => `Date: ${w.date}, Type: ${w.type}, Title: ${w.title}`)
      .join("\n");

    const prompt = `
    You are an AI fitness advisor. Analyze the user's recent workouts and give a concise suggestion for the next session.
    Use one of these types: "Rest", "Strength", or "Endurance/Metcon".
    Be motivational and short.
    
    Workout history:
    ${workoutHistory}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const suggestion = completion.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ suggestion }),
    };
  } catch (error) {
    console.error("Error generating suggestion:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate suggestion." }),
    };
  }
};
