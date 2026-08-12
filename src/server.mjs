import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createReadingWorkflow, getCardCatalog, getPublicConfig } from "./reading-service.mjs";


const MAX_BODY_BYTES = 16 * 1024;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARD_ASSET_ROOT = path.join(ROOT, "public", "cards_corrected");


function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(body);
}


async function sendCardAsset(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return sendJson(response, 400, { error: "资源路径无效。" });
  }
  const relativePath = decodedPath.slice("/cards_corrected/".length);
  const filename = path.resolve(CARD_ASSET_ROOT, relativePath);
  if (!relativePath || !filename.startsWith(`${CARD_ASSET_ROOT}${path.sep}`)) {
    return sendJson(response, 404, { error: "Not found" });
  }
  try {
    const metadata = await stat(filename);
    if (!metadata.isFile()) return sendJson(response, 404, { error: "Not found" });
    const contentType = path.extname(filename).toLowerCase() === ".png"
      ? "image/png"
      : "application/json; charset=utf-8";
    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": metadata.size,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") return response.end();
    return response.end(await readFile(filename));
  } catch (error) {
    if (error.code === "ENOENT") return sendJson(response, 404, { error: "Not found" });
    throw error;
  }
}


async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("请求内容过大。");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("请求必须是合法 JSON。");
  }
}


function errorStatus(error) {
  const message = error.message ?? "";
  if (/API_KEY|BASE_URL|MODEL is not configured/u.test(message)) return 503;
  if (/failed \(/u.test(message)) return 502;
  return 400;
}


export function createAppServer({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      if (request.method === "OPTIONS") {
        response.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
        });
        return response.end();
      }
      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, { status: "ok" });
      }
      if (request.method === "GET" && url.pathname === "/api/config") {
        return sendJson(response, 200, await getPublicConfig(env));
      }
      if (request.method === "GET" && url.pathname === "/api/cards") {
        return sendJson(response, 200, await getCardCatalog());
      }
      if (request.method === "POST" && url.pathname === "/api/readings") {
        const input = await readJsonBody(request);
        const result = await createReadingWorkflow({ ...input, env, fetchImpl });
        return sendJson(response, 200, result);
      }
      if (["GET", "HEAD"].includes(request.method) && url.pathname.startsWith("/cards_corrected/")) {
        return await sendCardAsset(request, response, url.pathname);
      }
      return sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      return sendJson(response, errorStatus(error), { error: error.message || "Request failed" });
    }
  });
}


export function startServer({
  host = process.env.HOST ?? "127.0.0.1",
  port = Number(process.env.PORT ?? 8787),
  env = process.env,
} = {}) {
  const server = createAppServer({ env });
  server.listen(port, host, () => {
    const address = server.address();
    console.log(`Tarot API listening on http://${host}:${address.port}`);
  });
  return server;
}
