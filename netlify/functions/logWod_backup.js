// netlify/functions/logWod.js
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  console.log("📩 logWod called");

  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const { wod, userId = null, result = null, notes = null, date = null } = body;

    if (!wod) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing workout data (wod)" }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials.");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();
    const mainSection = wod.metcon || wod.endurance || wod.hiit || wod.strength || null;

    const logEntry = {
      created_at: date ? new Date(date).toISOString() : now,
      user_id: userId,
      goal: wod.goal || "N/A",
      focus: Array.isArray(wod.focus) ? wod.focus.join(", ") : null,
      equipment: Array.isArray(wod.equipment) ? wod.equipment.join(", ") : null,
      target_duration: wod.targetDuration || mainSection?.targetDuration || null,
      type:
        (mainSection && Object.keys(wod).find((key) => wod[key] === mainSection)) ||
        "unknown",
      title: mainSection?.name || "Unnamed WOD",
      description: mainSection?.description || "No description available",
      result,
      notes,
      structure: JSON.stringify(wod),
    };

    const { data, error } = await supabase.from("wod_logs").insert([logEntry]).select();
    if (error) throw new Error(error.message);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Workout logged", id: data[0]?.id }),
    };
  } catch (error) {
    console.error("🔥 logWod error:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
