# OverflowParking

A small, fast, static directory of **official airport lots** and **verified off-airport parking**, for the day the cheap official lot is sold out or priced up.

Brand name: **OverflowParking**. The public URL in `src/_data/site.js` is `https://truekao1.github.io/overflowparking`. The Eleventy path prefix is derived from that URL. Do not put a personal name on the site.

This is an independent directory, not an airport, parking operator, or booking marketplace.

## Where it lives

Project path: `/workspace/sites/overflowparking`

Built files go to `dist/` and are published to GitHub Pages by `.github/workflows/pages.yml` on every push to `main`.

## How to build

```bash
npm install
npm run build        # writes dist/
npm start            # local preview
npm run check        # validates airport JSON, builds, checks internal links and JSON-LD
```

The public base URL, contact mailbox, and affiliate links are all in one file: `src/_data/site.js`. Affiliate `url` values stay empty until a program issues a tracked link. Templates then fall back to each company’s public website and must not present that fallback as an affiliate URL. Official airport reservation links and individual lot booking links are always plain public links.

## Data schema

Add an airport by adding one file: `data/airports/<st>-<code>.json` (for example `data/airports/ny-jfk.json`). The nightly research checklist is in `scripts/new-city.md`. A starter file is in `scripts/city.template.json`.

Rules:

- Never invent a lot, hour, shuttle fact, fee, phone, or flag.
- Every fact needs a public source URL and a `lastChecked` date.
- Official daily rates need a `rateAsOf` date. Pages must label them “as listed on <date>.”
- `shuttle` is described only when the operator’s public page mentions a shuttle.
- `open24Hours` is true only when a public page says the lot is open 24 hours, 24/7, or all day every day.
- `authorizedOffAirport` is true only when the official airport page lists that operator.
- `hotelParkAndFly` is true only when the hotel’s official page describes a stay-and-park package.
- Do not cache live prices or open spots. Deep-link the airport or the operator’s own booking page.
- If a site is down or a detail is unclear, leave the listing or the detail out. Use `Not published` for a day’s hours rather than inventing “Closed.”

## Launch content

- Home page
- Guide: “Airport parking full? What to do and where to park instead” (official prebooking, off-airport shuttles, hotel park-and-fly, and transit parking)
- JFK — 5 official lots with published daily rates and 8 verified off-airport listings (including two lots the airport lists as authorized off-airport providers, and two hotel park-and-fly options), last checked November 18, 2026
- LAX — 6 official lots (CTA general, premium, and valet; Economy; Budget; and Van Nuys FlyAway parking for bus patrons) with published daily rates, plus 8 verified off-airport listings, last checked November 18, 2026

## Affiliate programs

Application drafts (not sent) live in `AFFILIATES.md`. Program pages with first-party or carefully labeled network terms:

- Airport Parking Reservations (primary): https://airportparkingreservations.com/register/affiliate
- The Parking Spot (network listing, confirm in-dashboard): https://www.flexoffers.com/affiliate-programs/the-parking-spot-affiliate-program/

On Air Parking and Rakuten Advertising were dropped on 27 November 2026. Do not reapply to either, and do not add On Air Parking or Rakuten links to the site.

Official airport reservation pages and individual lot booking links are ordinary public links, not affiliate offers.

## Stack

Eleventy 3 builds plain HTML, CSS, and a small vanilla JS filter into `dist/`. Pages are mobile-first, with unique titles and meta descriptions, canonical URLs, Open Graph tags, `sitemap.xml`, `robots.txt`, breadcrumbs, an affiliate disclosure, and JSON-LD (`WebSite` / `ItemList` on the home page; `CollectionPage` + `ItemList` + `LocalBusiness`, `FAQPage`, and `BreadcrumbList` on airport pages; `Article` and `FAQPage` on the guide).
