// netlify/functions/testSupabase.js
exports.handler = async () => {
  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    const { data, error } = await supabase
      .from("wod_logs")
      .select("*")
      .limit(1);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Supabase connection successful ✅",
        sample: data,
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
