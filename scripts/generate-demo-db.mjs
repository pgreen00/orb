/**
 * Generates docs/public/demos/products.duckdb, the 100,000 example products
 * the server-side grid demo queries. The rows come from hashes of each id, so
 * every run makes the same data. It runs DuckDB-WASM from jsdelivr in headless
 * Chromium, the same build the site loads, so the file always opens there.
 *
 * Run it with `node scripts/generate-demo-db.mjs`. It needs the network.
 */
import http from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const DUCKDB = "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/+esm";
const ROWS = 100_000;
const OUT = "docs/public/demos/products.duckdb";

// Each item has its category and a typical price
const ITEMS = [
  ["Headphones", "Electronics", 120], ["Speaker", "Electronics", 90], ["Keyboard", "Electronics", 75],
  ["Monitor", "Electronics", 260], ["Webcam", "Electronics", 60], ["Charger", "Electronics", 25],
  ["Backpack", "Bags", 70], ["Tote", "Bags", 35], ["Duffel", "Bags", 85], ["Wallet", "Bags", 40],
  ["Jacket", "Clothing", 140], ["Hoodie", "Clothing", 55], ["Sneakers", "Clothing", 95], ["Scarf", "Clothing", 30],
  ["Mug", "Kitchen", 15], ["Skillet", "Kitchen", 45], ["Kettle", "Kitchen", 50], ["Knife", "Kitchen", 65],
  ["Lamp", "Home", 80], ["Rug", "Home", 150], ["Pillow", "Home", 25], ["Planter", "Home", 30],
  ["Tent", "Outdoors", 220], ["Lantern", "Outdoors", 35], ["Hammock", "Outdoors", 60], ["Water Bottle", "Outdoors", 20],
  ["Notebook", "Office", 12], ["Pen Set", "Office", 18], ["Desk Organizer", "Office", 28], ["Chair", "Office", 240],
];
const ADJECTIVES = ["Classic", "Compact", "Deluxe", "Everyday", "Lightweight", "Modern", "Rugged", "Smart", "Travel", "Ultra", "Vintage", "Wireless"];
const MATERIALS = ["Bamboo", "Canvas", "Ceramic", "Cotton", "Leather", "Linen", "Oak", "Steel", "Wool", ""];
const BRANDS = ["Acorn & Co", "Brightline", "Cedar Works", "Driftwood", "Evergreen", "Fieldnote", "Granite", "Harbor", "Ironbark", "Juniper", "Kestrel", "Lumen", "Meridian", "Northwind", "Orchard", "Pinecrest", "Quill", "Riverstone", "Summit", "Tidewater"];

const sqlList = (values) => `[${values.map((v) => (typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : v)).join(", ")}]`;
// A whole number from 0 to n - 1, from the id and a salt. One string is
// hashed, since hashing them as two values gives related results per salt.
const pick = (salt, n) => `(hash(i::VARCHAR || ':${salt}') % ${n})::INTEGER`;

const SQL = `
  CREATE TABLE products AS
  WITH ids AS (SELECT range AS i FROM range(1, ${ROWS + 1})),
  picked AS (
    SELECT i, ${pick("item", ITEMS.length)} + 1 AS item, ${pick("price", 1000)} / 1000.0 AS spread
    FROM ids
  )
  SELECT
    i::INTEGER AS id,
    trim(
      ${sqlList(ADJECTIVES)}[${pick("adjective", ADJECTIVES.length)} + 1] || ' ' ||
      ${sqlList(MATERIALS)}[${pick("material", MATERIALS.length)} + 1]
    ) || ' ' || ${sqlList(ITEMS.map((x) => x[0]))}[item] AS name,
    ${sqlList(BRANDS)}[${pick("brand", BRANDS.length)} + 1] AS brand,
    ${sqlList(ITEMS.map((x) => x[1]))}[item] AS category,
    round(${sqlList(ITEMS.map((x) => x[2]))}[item] * (0.6 + spread * 0.9), 2)::DOUBLE AS price,
    (10 + ${pick("rating", 41)}) / 10.0 AS rating,
    ${pick("stock", 500)} AS stock,
    DATE '2021-01-01' + ${pick("added", 1800)} AS added
  FROM picked
  ORDER BY id
`;

const server = http
  .createServer((_, res) => res.writeHead(200, { "content-type": "text/html" }).end("<!doctype html>"))
  .listen(0);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${server.address().port}/`);
  const base64 = await page.evaluate(
    async ({ url, sql }) => {
      const duckdb = await import(url);
      const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" }),
      );
      const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(workerUrl));
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      // DuckDB-WASM writes database files to the origin private file system
      const dir = await navigator.storage.getDirectory();
      await dir.removeEntry("products.duckdb").catch(() => {});
      await dir.removeEntry("products.duckdb.wal").catch(() => {});
      await db.open({ path: "opfs://products.duckdb", accessMode: duckdb.DuckDBAccessMode.READ_WRITE });
      const conn = await db.connect();
      await conn.query(sql);
      await conn.query("CHECKPOINT");
      await conn.close();
      await db.terminate();
      const file = await (await dir.getFileHandle("products.duckdb")).getFile();
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(binary);
    },
    { url: DUCKDB, sql: SQL },
  );
  const bytes = Buffer.from(base64, "base64");
  mkdirSync("docs/public/demos", { recursive: true });
  writeFileSync(OUT, bytes);
  console.log(`Wrote ${OUT}: ${ROWS} rows, ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
} finally {
  await browser.close();
  server.close();
}
