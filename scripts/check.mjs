import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import site from "../src/_data/site.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const airportsDir = path.join(root, "data", "airports");
const distDir = path.join(root, "dist");

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const flagKeys = ["shuttle", "covered", "valet", "open24Hours", "evCharging", "authorizedOffAirport", "hotelParkAndFly"];
const categories = new Set(["offsite", "hotel"]);
const officialRequiredRate = ["driveUpDailyMax", "prebookRate"];


function checkHours(label, hours) {
  if (!hours || typeof hours !== "object") {
    fail(`${label}: hours must be an object`);
    return;
  }
  for (const day of days) {
    if (hours[day] == null || hours[day] === "") {
      fail(`${label}: missing hours.${day}`);
    }
  }
}

function checkSources(label, sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    fail(`${label}: at least one source is required`);
  } else {
    sources.forEach((source, j) => {
      if (!source.label) fail(`${label}: source ${j + 1} is missing a label`);
      if (!isHttpUrl(source.url)) fail(`${label}: source ${j + 1} needs a public http(s) URL`);
    });
  }
}

function checkOfficialLot(expected, lot, i) {
  const label = `${expected} official lot ${i + 1} (${lot.name || "unnamed"})`;
  for (const field of ["name", "category", "area", "access", "hours", "sources", "lastChecked", "rateAsOf", "bookingUrl"]) {
    if (lot[field] == null || lot[field] === "") fail(`${label}: missing ${field}`);
  }
  if (lot.category !== "official") fail(`${label}: category must be "official"`);
  if (!officialRequiredRate.some((key) => lot[key])) {
    fail(`${label}: needs a published drive-up daily maximum or prebook rate`);
  }
  if (lot.bookingUrl && !isHttpUrl(lot.bookingUrl)) fail(`${label}: bookingUrl is not an http(s) URL`);
  if (!isDate(lot.lastChecked)) fail(`${label}: lastChecked must be YYYY-MM-DD`);
  if (!isDate(lot.rateAsOf)) fail(`${label}: rateAsOf must be YYYY-MM-DD`);
  checkHours(label, lot.hours);
  checkSources(label, lot.sources);
}

function checkAirportFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    fail(`${path.basename(file)} is not valid JSON: ${err.message}`);
    return;
  }

  const expected = path.basename(file);
  const slugName = `${String(data.state || "").toLowerCase()}-${data.citySlug || ""}.json`;
  if (expected !== slugName) {
    warnings.push(`${expected} does not match suggested name ${slugName}`);
  }

  for (const field of ["slug", "city", "citySlug", "state", "stateName", "airportCode", "airportName", "intro", "lastUpdated", "officialLots", "listings"]) {
    if (data[field] == null || data[field] === "") fail(`${expected}: missing ${field}`);
  }
  if (data.state && String(data.state).length !== 2) fail(`${expected}: state should be a two-letter code`);
  if (!isDate(data.lastUpdated)) fail(`${expected}: lastUpdated must be YYYY-MM-DD`);
  if (data.officialBookingUrl && !isHttpUrl(data.officialBookingUrl)) {
    fail(`${expected}: officialBookingUrl is not an http(s) URL`);
  }
  if (!Array.isArray(data.officialLots) || data.officialLots.length === 0) {
    fail(`${expected}: officialLots must be a non-empty array`);
  } else {
    data.officialLots.forEach((lot, i) => checkOfficialLot(expected, lot, i));
  }
  if (!Array.isArray(data.listings) || data.listings.length === 0) {
    fail(`${expected}: listings must be a non-empty array`);
    return;
  }
  if (data.listings.length < 8) {
    fail(`${expected}: ${data.listings.length} off-airport listings (launch target is at least 8)`);
  }

  data.listings.forEach((listing, i) => {
    const label = `${expected} listing ${i + 1} (${listing.name || "unnamed"})`;
    for (const field of ["name", "category", "area", "address", "hours", "shuttle", "offers", "flags", "sources", "lastChecked", "bookingUrl"]) {
      if (listing[field] == null || listing[field] === "") fail(`${label}: missing ${field}`);
    }
    if (!categories.has(listing.category)) {
      fail(`${label}: category must be "truck" or "labor"`);
    }
    if (listing.website && !isHttpUrl(listing.website)) fail(`${label}: website is not an http(s) URL`);
    if (listing.bookingUrl && !isHttpUrl(listing.bookingUrl)) fail(`${label}: bookingUrl is not an http(s) URL`);
    if (!isDate(listing.lastChecked)) fail(`${label}: lastChecked must be YYYY-MM-DD`);
    if (!listing.hours || typeof listing.hours !== "object") {
      fail(`${label}: hours must be an object`);
    } else {
      for (const day of days) {
        if (listing.hours[day] == null || listing.hours[day] === "") {
          fail(`${label}: missing hours.${day}`);
        }
      }
    }
    if (!Array.isArray(listing.offers) || listing.offers.length === 0) {
      fail(`${label}: offers must be a non-empty array of published services`);
    }
    if (!listing.flags) {
      fail(`${label}: missing flags`);
    } else {
      for (const key of flagKeys) {
        if (typeof listing.flags[key] !== "boolean") fail(`${label}: flags.${key} must be a boolean`);
      }
    }
    if (!Array.isArray(listing.sources) || listing.sources.length === 0) {
      fail(`${label}: at least one source is required`);
    } else {
      listing.sources.forEach((source, j) => {
        if (!source.label) fail(`${label}: source ${j + 1} is missing a label`);
        if (!isHttpUrl(source.url)) fail(`${label}: source ${j + 1} needs a public http(s) URL`);
      });
    }
  });
}

if (!fs.existsSync(airportsDir)) {
  fail("data/airports does not exist");
} else {
  const files = fs.readdirSync(airportsDir).filter((name) => name.endsWith(".json"));
  if (!files.length) fail("no airport JSON files found");
  files.forEach((name) => checkAirportFile(path.join(airportsDir, name)));
}

const built = spawnSync("npm", ["run", "build"], { cwd: root, encoding: "utf8" });
if (built.status !== 0) {
  fail(`eleventy build failed:\n${built.stdout}\n${built.stderr}`);
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function mountPrefix() {
  const prefix = site.pathPrefix || "/";
  if (prefix === "/") return "";
  return prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
}

function stripMount(hrefPath) {
  const prefix = mountPrefix();
  if (!prefix || !hrefPath.startsWith("/")) return hrefPath;
  if (hrefPath === prefix || hrefPath.startsWith(`${prefix}/`)) {
    return hrefPath.slice(prefix.length) || "/";
  }
  return hrefPath;
}

function resolveInternal(fromFile, href) {
  const raw = href.split("#")[0].split("?")[0];
  if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || /^(https?:)?\/\//.test(raw)) {
    return null;
  }
  const clean = stripMount(raw);
  if (clean.endsWith(".xml") || clean.endsWith(".txt") || clean.endsWith(".html") || path.extname(clean)) {
    const abs = clean.startsWith("/")
      ? path.join(distDir, clean.slice(1))
      : path.join(path.dirname(fromFile), clean);
    return abs;
  }
  const rel = clean.startsWith("/") ? clean.slice(1) : path.relative(distDir, path.join(path.dirname(fromFile), clean));
  const base = path.join(distDir, rel);
  return [base, path.join(base, "index.html"), `${base}.html`];
}

if (fs.existsSync(distDir) && built.status === 0) {
  const htmlFiles = walk(distDir).filter((file) => file.endsWith(".html"));
  const hrefRe = /(?:href|src)="([^"]+)"/g;
  const prefix = mountPrefix();
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    let match;
    while ((match = hrefRe.exec(html))) {
      const href = match[1];
      if (prefix && href.startsWith("/") && !href.startsWith("//")) {
        if (href !== prefix && !href.startsWith(`${prefix}/`)) {
          fail(`root link missing path prefix in ${path.relative(distDir, file)}: ${href}`);
        }
      }
      const resolved = resolveInternal(file, href);
      if (!resolved) continue;
      const candidates = Array.isArray(resolved) ? resolved : [resolved];
      if (!candidates.some((candidate) => fs.existsSync(candidate))) {
        fail(`broken internal link in ${path.relative(distDir, file)}: ${href}`);
      }
    }

    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    blocks.forEach((block, i) => {
      try {
        JSON.parse(block[1]);
      } catch (err) {
        fail(`invalid JSON-LD in ${path.relative(distDir, file)} block ${i + 1}: ${err.message}`);
      }
    });
  }

  for (const required of [
    "index.html",
    "sitemap.xml",
    "robots.txt",
    "404.html",
    "about/index.html",
    "guides/airport-parking-full-what-to-do-and-where-to-park-instead/index.html",
    "affiliate-disclosure/index.html",
    "ny/jfk/index.html",
    "ca/lax/index.html",
  ]) {
    if (!fs.existsSync(path.join(distDir, required))) fail(`missing dist/${required}`);
  }

  const base = String(site.url || "").replace(/\/$/, "");
  const sitemap = fs.readFileSync(path.join(distDir, "sitemap.xml"), "utf8");
  const robots = fs.readFileSync(path.join(distDir, "robots.txt"), "utf8");
  const home = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  const airportPage = fs.readFileSync(path.join(distDir, "ny/jfk/index.html"), "utf8");
  const laxPage = fs.readFileSync(path.join(distDir, "ca/lax/index.html"), "utf8");
  const guidePage = fs.readFileSync(path.join(distDir, "guides/airport-parking-full-what-to-do-and-where-to-park-instead/index.html"), "utf8");
  for (const loc of [
    `${base}/`,
    `${base}/about/`,
    `${base}/guides/airport-parking-full-what-to-do-and-where-to-park-instead/`,
    `${base}/ny/jfk/`,
    `${base}/ca/lax/`,
  ]) {
    if (!sitemap.includes(`<loc>${loc}</loc>`)) fail(`sitemap.xml missing ${loc}`);
  }
  if (!robots.includes(`Sitemap: ${base}/sitemap.xml`)) {
    fail(`robots.txt missing Sitemap: ${base}/sitemap.xml`);
  }
  if (!home.includes(`${base}/`)) fail(`home page missing absolute URL ${base}/`);
  if (!home.includes(`"@type":"WebSite"`) && !home.includes(`"@type": "WebSite"`)) {
    fail("home page missing WebSite JSON-LD");
  }
  if (!airportPage.includes(`${base}/ny/jfk/`)) {
    fail(`JFK page missing absolute URL ${base}/ny/jfk/`);
  }
  if (!laxPage.includes(`${base}/ca/lax/`)) {
    fail(`LAX page missing absolute URL ${base}/ca/lax/`);
  }
  if (!airportPage.includes("as listed on") || !laxPage.includes("as listed on")) {
    fail("airport pages must label published rates with “as listed on” and a date");
  }
  if (
    !guidePage.includes("Airport parking full") ||
    !guidePage.includes("off-airport") ||
    !guidePage.includes("park-and-fly") ||
    !guidePage.includes("reservation")
  ) {
    fail("sold-out guide is missing expected sections (title, off-airport, park-and-fly, official reservations)");
  }
  if (prefix && (home.includes(`${prefix}/${prefix.replace(/^\//, "")}`) || airportPage.includes(`${prefix}/${prefix.replace(/^\//, "")}`))) {
    fail("built HTML doubled the path prefix");
  }
}

if (warnings.length) {
  console.log("Warnings:");
  warnings.forEach((w) => console.log("  -", w));
}
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  errors.forEach((e) => console.error("  -", e));
  process.exit(1);
}

const airportCount = fs.readdirSync(airportsDir).filter((n) => n.endsWith(".json")).length;
console.log(`OK: ${airportCount} airport file(s), build succeeded, internal links and JSON-LD parsed.`);
