import assert from "node:assert/strict";
import test from "node:test";

import { createAppServer } from "../src/server.mjs";


async function withServer(run) {
  const server = createAppServer({ env: {} });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}


test("serves health and public config endpoints", async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
    assert.deepEqual(health, { status: "ok" });
    const config = await fetch(`${baseUrl}/api/config`).then((response) => response.json());
    assert.equal(config.spreads.length, 2);
    const catalog = await fetch(`${baseUrl}/api/cards`).then((response) => response.json());
    assert.equal(catalog.cards.length, 78);
    assert.equal(catalog.assets.card_back, "/cards_corrected/back/card_back.png");
  });
});


test("serves corrected card assets without exposing arbitrary files", async () => {
  await withServer(async (baseUrl) => {
    const card = await fetch(`${baseUrl}/cards_corrected/major/00_the_fool.png`, { method: "HEAD" });
    assert.equal(card.status, 200);
    assert.equal(card.headers.get("content-type"), "image/png");
    const traversal = await fetch(`${baseUrl}/cards_corrected/%2e%2e/%2e%2e/data/tarot_cards.json`);
    assert.equal(traversal.status, 404);
  });
});


test("serves a complete dry-run reading", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/readings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "我的工作接下来会怎样？", seed: 9, dry_run: true }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.status, "preview");
    assert.equal(result.cards.length, 3);
  });
});


test("returns a client error for malformed input", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/readings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    assert.equal(response.status, 400);
  });
});
