import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HtmlBasePlugin } from "@11ty/eleventy";
import site from "./src/_data/site.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function originAndPrefix(base) {
  const root = String(base || "").replace(/\/$/, "");
  try {
    const { origin, pathname } = new URL(root);
    const prefix = !pathname || pathname === "/" ? "" : pathname.replace(/\/$/, "");
    return { origin, prefix, root };
  } catch {
    return { origin: root, prefix: "", root };
  }
}

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addWatchTarget("data/airports/");
  eleventyConfig.addWatchTarget("src/assets/");

  eleventyConfig.addFilter("isoDate", (value) => {
    if (!value) return "";
    return String(value).slice(0, 10);
  });

  eleventyConfig.addFilter("displayDate", (value) => {
    if (!value) return "";
    const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  eleventyConfig.addFilter("hoursSummary", (hours) => {
    if (!hours) return "Confirm with the store";
    if (hours.summary) return hours.summary;
    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const values = days.map((day) => (hours[day] || "").trim());
    const groups = [];
    let i = 0;
    while (i < 7) {
      let j = i;
      while (j + 1 < 7 && values[j + 1] === values[i] && values[i]) j += 1;
      if (values[i]) {
        const label = i === j ? labels[i] : `${labels[i]}–${labels[j]}`;
        groups.push(`${label} ${values[i]}`);
      }
      i = j + 1;
    }
    return groups.join("; ") || "Confirm with the store";
  });

  eleventyConfig.addFilter("telHref", (phone) => {
    if (!phone) return "";
    const digits = String(phone).replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : "";
  });

  eleventyConfig.addFilter("slugifyId", (name) =>
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  );

  eleventyConfig.addFilter("jsonLd", (obj) =>
    JSON.stringify(obj).replace(/</g, "\\u003c")
  );

  eleventyConfig.addFilter("absoluteUrl", (pathname, base) => {
    const { origin, prefix, root } = originAndPrefix(base);
    if (!pathname) return `${root}/`;
    if (/^https?:\/\//.test(pathname)) return pathname;
    const pathName = pathname.startsWith("/") ? pathname : `/${pathname}`;
    if (prefix && (pathName === prefix || pathName.startsWith(`${prefix}/`))) {
      return `${origin}${pathName}`;
    }
    return `${root}${pathName}`;
  });

  eleventyConfig.addFilter("airportPath", (airport) => {
    const state = String(airport.state || "").toLowerCase();
    const slug =
      airport.citySlug ||
      String(airport.airportCode || airport.city || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
    return `/${state}/${slug}/`;
  });

  eleventyConfig.addFilter("rateAsListed", (value, date) => {
    if (!value) return "";
    const labeled = String(date || "").slice(0, 10);
    let pretty = labeled;
    if (labeled) {
      const d = new Date(`${labeled}T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        pretty = d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
    return pretty ? `${value} (as listed on ${pretty})` : value;
  });

  eleventyConfig.addFilter("joinList", (items) => {
    if (!Array.isArray(items) || !items.length) return "";
    return items.join(", ");
  });

  eleventyConfig.addFilter("affiliateHref", (program) => {
    if (!program) return "";
    const tracked = String(program.url || "").trim();
    if (tracked) return tracked;
    return program.publicUrl || "";
  });

  eleventyConfig.addFilter("affiliateIsTracked", (program) =>
    Boolean(program && String(program.url || "").trim())
  );

  const dayMap = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  function parseClockRange(value) {
    if (!value) return null;
    const text = String(value);
    if (/^not published$/i.test(text.trim())) return null;
    if (/^closed$/i.test(text.trim())) return null;
    const re =
      /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)|midnight|noon)\s*[–-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)|midnight)/i;
    const m = text.match(re);
    if (!m) return null;
    const to24 = (s) => {
      const t = s.trim().toLowerCase();
      if (t === "midnight") return "00:00";
      if (t === "noon") return "12:00";
      const mm = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
      if (!mm) return null;
      let h = Number(mm[1]);
      const min = mm[2];
      const ap = mm[3];
      if (ap === "pm" && h !== 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${min}`;
    };
    let opens = to24(m[1]);
    let closes = to24(m[2]);
    if (!opens || !closes) return null;
    if (closes === "00:00" && /midnight/i.test(m[2])) closes = "23:59";
    return { opens, closes };
  }

  function listingToLocalBusiness(listing) {
    const url = listing.website || listing.bookingUrl;
    const business = {
      "@type": "LocalBusiness",
      name: listing.name,
      url,
      telephone: listing.phone || undefined,
      areaServed: listing.area,
      description:
        listing.offersNotes ||
        listing.feeNotes ||
        listing.visitNotes ||
        undefined,
    };
    if (listing.address) {
      business.address = {
        "@type": "PostalAddress",
        streetAddress: listing.address,
      };
    }
    const hours = [];
    if (listing.hours) {
      for (const [day, value] of Object.entries(dayMap)) {
        const raw = listing.hours[day];
        if (!raw) continue;
        if (/24\s*hours|24\/7/i.test(raw) && !/not\s+published|closed/i.test(raw)) {
          hours.push({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: value,
            opens: "00:00",
            closes: "23:59",
          });
          continue;
        }
        const range = parseClockRange(raw);
        if (range) {
          hours.push({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: value,
            opens: range.opens,
            closes: range.closes,
          });
        }
      }
    }
    if (hours.length) business.openingHoursSpecification = hours;
    return business;
  }

  eleventyConfig.addFilter("defaultAirportFaqs", (airport) => [
    {
      q: `What should I do if official parking at ${airport.airportCode} is sold out?`,
      a: `Start with the airport’s own reservation page, because some official lots still take prebooked reservations when drive-up spaces are gone. If the official lots you want are unavailable or more expensive than you want to pay, use the off-airport lots on this page. We do not cache live availability. Follow each operator’s own booking page and confirm shuttle pickup instructions before you go.`,
    },
    {
      q: "Are the daily rates on this page current?",
      a: "No. When we quote a published rate, we label it “as listed on” the date we checked the source. Airport and off-airport prices change, and prebooked rates can differ from drive-up rates. Confirm the price on the official reservation page or the operator’s site when you book.",
    },
    {
      q: "Do off-airport lots include a shuttle?",
      a: "We only describe a shuttle when that operator’s public page says there is one. Frequency, pickup points, and late-night service vary, and some hotel park-and-fly shuttles are for registered guests only. If a listing has no shuttle details, we left them out rather than guessing.",
    },
    {
      q: "What is hotel park-and-fly?",
      a: "Some airport hotels sell a stay plus multi-day parking and a shuttle. We only flag park-and-fly when the hotel’s official page describes that package. Terms, how many parking days you get, and whether you must book a room are set by the hotel. Read the offer before you reserve.",
    },
    {
      q: `How does OverflowParking verify listings at ${airport.airportCode}?`,
      a: "We only publish facts we found on a public page — usually the airport’s official parking page or the lot operator’s own website. Each listing has source links and a last-checked date. We do not invent hours, shuttle facts, or prices, and we do not treat a pasted rate as a live quote. If a site was down or a detail was unclear, we left it out.",
    },
  ]);

  eleventyConfig.addFilter("airportJsonLd", (airport, siteObj) => {
    const pageUrl = `${siteObj.url}/${String(airport.state).toLowerCase()}/${airport.citySlug}/`;
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Official and off-airport parking at ${airport.airportCode} (${airport.airportName})`,
      url: pageUrl,
      isPartOf: { "@type": "WebSite", name: siteObj.name, url: siteObj.url },
      about: {
        "@type": "ItemList",
        name: `Official lots and off-airport parking near ${airport.airportCode}`,
        numberOfItems: ((airport.officialLots || []).length + (airport.listings || []).length),
        itemListElement: [...(airport.officialLots || []), ...(airport.listings || [])].map((listing, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: listingToLocalBusiness(listing),
        })),
      },
    };
  });

  eleventyConfig.addFilter("faqJsonLd", (faqs, pageUrl) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: pageUrl,
    mainEntity: (faqs || []).map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  }));

  eleventyConfig.addFilter("breadcrumbJsonLd", (crumbs, siteObj) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: (crumbs || []).map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url
        ? crumb.url.startsWith("http")
          ? crumb.url
          : `${siteObj.url}${crumb.url.startsWith("/") ? crumb.url : `/${crumb.url}`}`
        : undefined,
    })),
  }));

  eleventyConfig.addFilter("homeJsonLd", (siteObj, airports) => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteObj.name,
    url: siteObj.url,
    description: siteObj.description,
    publisher: { "@type": "Organization", name: siteObj.name, url: siteObj.url },
    hasPart: {
      "@type": "ItemList",
      name: "Airports with official and off-airport parking listings",
      numberOfItems: (airports || []).length,
      itemListElement: (airports || []).map((airport, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${airport.airportCode} — ${airport.airportName}`,
        url: `${siteObj.url}/${String(airport.state).toLowerCase()}/${airport.citySlug}/`,
      })),
    },
  }));

  eleventyConfig.addFilter("guideJsonLd", (siteObj) => ({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Airport parking full? What to do and where to park instead",
    name: "Airport parking full? What to do and where to park instead",
    url: `${siteObj.url}/guides/airport-parking-full-what-to-do-and-where-to-park-instead/`,
    description:
      "What to do when official airport parking is sold out or expensive, including official prebooking, off-airport shuttle lots, hotel park-and-fly, and transit parking.",
    isPartOf: { "@type": "WebSite", name: siteObj.name, url: siteObj.url },
    publisher: { "@type": "Organization", name: siteObj.name, url: siteObj.url },
  }));

  eleventyConfig.addCollection("airports", () => {
    const dir = path.join(__dirname, "data", "airports");
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => {
        const raw = fs.readFileSync(path.join(dir, name), "utf8");
        const data = JSON.parse(raw);
        data._file = name;
        if (!data.citySlug) {
          data.citySlug = String(data.airportCode || data.city || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
        }
        return data;
      })
      .sort((a, b) =>
        String(a.airportCode || a.city).localeCompare(String(b.airportCode || b.city))
      );
  });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    pathPrefix: site.pathPrefix,
  };
}
