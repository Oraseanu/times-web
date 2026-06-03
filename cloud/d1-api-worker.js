const STATE_KEY = "app-state";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function readState(env) {
  const row = await env.DB
    .prepare("SELECT value FROM app_state WHERE key = ?")
    .bind(STATE_KEY)
    .first();

  return row?.value ? JSON.parse(row.value) : null;
}

async function writeState(env, state) {
  await env.DB
    .prepare(`
      INSERT INTO app_state (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `)
    .bind(STATE_KEY, JSON.stringify(state))
    .run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname !== "/state") {
      return new Response("Not found", { status: 404, headers: corsHeaders() });
    }

    if (request.method === "GET") {
      const state = await readState(env);
      return state ? jsonResponse(state) : new Response("Not found", { status: 404, headers: corsHeaders() });
    }

    if (request.method === "PUT") {
      const state = await request.json();
      await writeState(env, state);
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
  },
};
