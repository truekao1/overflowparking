/**
 * Site-wide config. `url` is the only deploy switch. Canonical tags,
 * Open Graph, JSON-LD, robots.txt, sitemap.xml, and the Eleventy path
 * prefix all follow it. Do not add a trailing slash.
 *
 * GitHub Pages project site:
 *   https://truekao1.github.io/overflowparking
 *
 * Affiliate `url` values stay empty until a program issues a tracked
 * link. Templates must then fall back to `publicUrl` as a plain
 * (non-affiliate) link. Do not present an empty or public URL as a
 * tracked affiliate link.
 *
 * Official airport reservation pages and individual lot booking links
 * are ordinary public links, not affiliate offers.
 */
const url = normalizeSiteUrl("https://truekao1.github.io/overflowparking");

function normalizeSiteUrl(value) {
  const parsed = new URL(value);
  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  if (!parsed.pathname || parsed.pathname === "/") return parsed.origin;
  return parsed.origin + parsed.pathname;
}

function pathPrefixFromUrl(value) {
  const { pathname } = new URL(value);
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export default {
  name: "OverflowParking",
  tagline: "Find a place to park when the official airport lot is full or priced up.",
  description:
    "A directory of official on-airport lots and verified off-airport shuttle lots, built for the day the cheap official lot is sold out or too expensive. Published daily rates are dated, not live quotes, and booking links go to the airport or the operator’s own site.",
  url,
  pathPrefix: pathPrefixFromUrl(url),
  locale: "en_US",
  language: "en",
  emailListings: "azb31pt9@mail.grokbot.com",
  emailContact: "azb31pt9@mail.grokbot.com",
  emailsArePlaceholders: false,
  disclosure:
    "OverflowParking may earn a commission if you use an approved affiliate link, at no extra cost to you. Until a program approves a tracked URL, buttons go to that company’s public website and are not affiliate links. Official airport reservation pages and individual lot booking links are ordinary public links, not affiliate offers.",
  affiliates: {
    airportParkingReservations: {
      id: "airportParkingReservations",
      name: "Airport Parking Reservations",
      url: "",
      publicUrl: "https://airportparkingreservations.com/",
      programUrl: "https://airportparkingreservations.com/register/affiliate",
    },
    onAirParking: {
      id: "onAirParking",
      name: "On Air Parking",
      url: "",
      publicUrl: "https://www.onairparking.com/",
      programUrl: "https://www.onairparking.com/affiliate",
    },
  },
};
