// netlify/functions/getLogs.js
exports.handler = async (event) => {
  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    const { userId } = event.queryStringParameters || {};

    let query = supabase
      .from("wod_logs")
      .select("*")
      .order("date", { ascending: false });

    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query;

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify(data || []),
    };
  } catch (e) {
    console.error("🔥 getLogs error:", e);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
