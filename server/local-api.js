import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const host = process.env.LOCAL_API_HOST || "127.0.0.1";
const port = Number(process.env.LOCAL_API_PORT || 8787);
const dbFile = resolve(process.env.LOCAL_DB_FILE || "local-db/state.json");

async function readState() {
  try {
    return await readFile(dbFile, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeState(body) {
  JSON.parse(body);
  await mkdir(dirname(dbFile), { recursive: true });
  await writeFile(dbFile, body, "utf8");
}

function send(res, status, body = "", headers = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...headers,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolveBody(body));
    req.on("error", reject);
  });
}

createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      send(res, 204);
      return;
    }

    if (req.url !== "/state") {
      send(res, 404, "Not found");
      return;
    }

    if (req.method === "GET") {
      const state = await readState();
      if (!state) {
        send(res, 404, "Not found");
        return;
      }
      send(res, 200, state, { "Content-Type": "application/json" });
      return;
    }

    if (req.method === "PUT") {
      await writeState(await readBody(req));
      send(res, 204);
      return;
    }

    send(res, 405, "Method not allowed");
  } catch (error) {
    console.error(error);
    send(res, 500, "Server error");
  }
}).listen(port, host, () => {
  console.log(`Times local API listening on http://${host}:${port}`);
  console.log(`State file: ${dbFile}`);
});
