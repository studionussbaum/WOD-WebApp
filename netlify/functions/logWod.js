// netlify/functions/logWod.js
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  console.log("📩 logWod called");

  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ success: false, error: "Method Not Allowed" }) };
    }

    // ---- Eingang loggen
    const raw = event.body || "{}";
    console.log("📥 RAW BODY:", raw);

    const body = JSON.parse(raw);
    const { wod, userId = null, result = null, notes = null, date = null } = body;

    if (!wod) {
      console.warn("⚠️ Missing 'wod' in body:", body);
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing workout data (wod)" }) };
    }

    // ---- Supabase Client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing Supabase credentials");
      return { statusCode: 500, body: JSON.stringify({ success: false, error: "Missing Supabase credentials" }) };
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ---- Haupt-Section bestimmen
    const mainSection = wod.metcon || wod.endurance || wod.hiit || wod.strength || null;

    // ---- LOG-Eintrag (nur Spalten, die es gibt; structure als Objekt für jsonb!)
    const logEntry = {
      user_id: userId,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      // optionale Felder – nur wenn deine Tabelle sie hat
      goal: wod.goal || "N/A",
      focus: Array.isArray(wod.focus) ? wod.focus.join(", ") : null,
      equipment: Array.isArray(wod.equipment) ? wod.equipment.join(", ") : null,
      target_duration: wod.targetDuration || mainSection?.targetDuration || null,
      type: (mainSection && Object.keys(wod).find((key) => wod[key] === mainSection)) || "unknown",
      title: mainSection?.name || "Unnamed WOD",
      description: mainSection?.description || "No description available",
      result,
      notes,
      structure: wod, // <-- wichtig: NICHT JSON.stringify!
    };

    console.log("🧾 INSERT PAYLOAD:", logEntry);

    const { data, error } = await supabase.from("wod_logs").insert([logEntry]).select();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message || error }) };
    }

    console.log("✅ Insert OK. Row:", data?.[0]);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Workout logged", id: data?.[0]?.id, row: data?.[0] }),
    };
  } catch (error) {
    console.error("🔥 logWod exception:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message || String(error) }) };
  }
};
