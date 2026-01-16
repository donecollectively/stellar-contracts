#!/usr/bin/env node
// Fetch Helios language guide pages linked from the left sidebar on the intro page.

import fs from "fs/promises";
import path from "path";

const fetchFn = global.fetch; // Node 18+ has fetch built-in

const BASE = "https://helios-lang.io/docs/";
const BASE_ORIGIN = new URL(BASE).origin;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const TARGETS = [
  { entry: `${BASE}sdk/ledger/`, prefix: "/docs/sdk/ledger" },
  { entry: `${BASE}sdk/tx-utils/`, prefix: "/docs/sdk/tx-utils" },
  { entry: `${BASE}lang/intro/`, prefix: "/docs/lang" },
];
// const skip = [
//     "cbor", "codec-utils", "compiler", "compiler-utils", "contract-utils", "crypto", "ir", "type-utils", "uplc",
// ]

// Anchor output at cwd (not script dir)
const OUT_ROOT = path.resolve(process.cwd(), "reference", "helios-lang");
const MAX_CONCURRENCY = 1;

async function main() {
  await fs.mkdir(OUT_ROOT, { recursive: true });

  const seen = new Set();
  const queue = [];
  const brokenLinks = [];

  // seed with targets
  for (const t of TARGETS) enqueue({ url: ensureTrailingSlash(t.entry), from: null }, queue, seen);

  const workers = Array.from({ length: MAX_CONCURRENCY }, () => worker(queue, seen, brokenLinks));
  await Promise.all(workers);

  if (brokenLinks.length) {
    console.warn("\nBroken links:");
    for (const { url, from, status } of brokenLinks) {
      console.warn(`  ${status || "error"} ${url} (from ${from || "root"})`);
    }
  }
}

async function worker(queue, seen, brokenLinks) {
  while (queue.length) {
    const { url, from } = queue.pop();
    try {
      const outfile = toOutPath(url);
      const cached = await readCache(outfile);
      let html = cached?.html;
      let usedCache = cached?.fresh === true;
      let freshened = cached && cached.fresh === false;
      let fetched = false;

      if (!usedCache || freshened) {
        const fetchedHtml = await fetchText(url, from, brokenLinks);
        if (fetchedHtml) {
          html = fetchedHtml;
          fetched = true;
          await fs.mkdir(path.dirname(outfile), { recursive: true });
          await fs.writeFile(outfile, html, "utf8");
        } else if (cached?.html) {
          html = cached.html; // fallback to stale cache on fetch failure
          usedCache = true;
        }
      }

      if (!html) continue;

      const relLog = path.relative(process.cwd(), outfile);
      console.log(`${usedCache ? "   cached" : freshened ? "freshened" : "  fetched"} ${relLog}`);

      if (fetched) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // discover more sidebar links on this page
      const extra = extractSidebarLinks(html);
      for (const next of extra) enqueue({ url: next, from: url }, queue, seen);
    } catch (err) {
      console.error(`Failed ${url}:`, err.message);
    }
  }
}

async function fetchText(url, from, brokenLinks) {
  const res = await fetchFn(url, { redirect: "follow" });
  if (!res.ok) {
    console.warn(`Skipping ${url} (${res.status})`);
    brokenLinks.push({ url, from, status: res.status });
    return null;
  }
  return res.text();
}

function extractSidebarLinks(html) {
  // Sidebar links are in the left nav; match any href under /docs/<SECTION>/ that is not a hash link.
  const hrefRegex = /href="([^"]*?)"/gi;
  const urls = new Set();
  for (const [, href] of html.matchAll(hrefRegex)) {
    if (!href || href.startsWith("#")) continue;
    const absolute = href.startsWith("http") ? href : new URL(href, BASE).toString();
    let u;
    try {
      u = new URL(absolute);
    } catch {
      continue;
    }
    // keep only same-origin pages under configured prefixes
    if (u.origin !== BASE_ORIGIN) continue;
    if (!matchesTargetPrefix(u.pathname)) continue;
    if (u.pathname.includes("/blob/")) continue;
    u.hash = "";
    const normalized = u.toString().replace(/(?<!:)\/\/$/, "/");
    urls.add(normalized);
  }
  return urls;
}

function toOutPath(url) {
  const u = new URL(url);
  let pathname = u.pathname || "/";
  // Strip only /docs/ so section/subsection remain in the local path.
  pathname = pathname.replace(/^\/?docs\/?/, "/");
  if (pathname.endsWith("/")) {
    pathname = path.posix.join(pathname, "index.html");
  } else {
    pathname = `${pathname}.html`;
  }
  const rel = pathname.replace(/^\/+/, "");
  return path.join(OUT_ROOT, rel);
}

async function readCache(outfile) {
  try {
    const stat = await fs.stat(outfile);
    const age = Date.now() - stat.mtimeMs;
    const html = await fs.readFile(outfile, "utf8");
    return { html, fresh: age <= MAX_AGE_MS };
  } catch {
    return null;
  }
}

function enqueue(item, queue, seen) {
  const key = item.url;
  if (seen.has(key)) return;
  seen.add(key);
  queue.push(item);
}

function matchesTargetPrefix(pathname) {
  return TARGETS.some((t) => pathname.startsWith(t.prefix));
}

function ensureTrailingSlash(u) {
  return u.endsWith("/") ? u : `${u}/`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

