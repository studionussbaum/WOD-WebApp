// netlify/functions/logWod.js
exports.handler = async (event) => {
  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { userId = "guest", date, wodData, result = "", notes = "" } =
      JSON.parse(event.body || "{}");

    if (!wodData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing wodData" }),
      };
    }

    const { data, error } = await supabase
      .from("wod_logs")
      .insert([
        {
          user_id: userId,
          date: date || new Date().toISOString(),
          wod_data: wodData,
          result,
          notes,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Workout logged successfully ✅",
        entry: data,
      }),
    };
  } catch (e) {
    console.error("🔥 logWod error:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
