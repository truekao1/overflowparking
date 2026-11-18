# Nightly airport research checklist

Use this when adding one airport page to OverflowParking. Invent nothing. If a fact cannot be verified on a public page, leave it out.

## 1. Pick the next airport

Prefer a busy U.S. airport where official lots are often sold out or expensive, and where off-airport operators publish their own sites. Record the airport code, city, and state. Name the data file `data/airports/<st>-<code>.json` (for example `data/airports/ny-jfk.json`). A starter file is in `scripts/city.template.json`.

## 2. Collect official lots first

Start with the airport’s official parking page and official reservation site.

For each official lot, copy only what the airport publishes:

- Lot name
- Address, if the airport or official reservation page lists one
- How you get to the terminals (walk, AirTrain, official shuttle)
- Hours, if published. Use `Not published` for a missing day; do not invent “Closed.”
- Drive-up daily maximum and, separately, any prebook or “as low as” rate
- Increment or hourly charges, height limits, and reservation rules
- The official booking URL

Label every rate with a `rateAsOf` date. Templates will print “as listed on <date>.” Never present a copied rate as a live price. Do not scrape availability.

## 3. Collect at least eight off-airport listings

Include independent shuttle lots and, when a hotel’s official page describes one, park-and-fly packages. Booking links must go to the operator’s own site, not a third-party marketplace.

For each listing, copy only what that operator publishes:

- Name, street address, phone
- Website and booking URL on the operator’s own domain
- Hours for each day
- Shuttle facts (whether it is free, how often it runs, where it picks up, late-night rules). If those are missing, say so or omit the detail; do not guess.
- Covered, valet, self-park, and EV charging flags — true only when the public page says so
- `open24Hours` is true only when the page says the lot is open 24 hours, 24/7, or all day every day
- `authorizedOffAirport` is true only when the official airport page lists that operator
- `hotelParkAndFly` is true only when the hotel’s official page describes a stay-and-park (or similar) package
- Any published rate, labeled “as listed on <date>.” Prefer omitting a fluctuating “from $X” figure if you cannot date it. Never cache a calendar price as current.

Eight solid, verified listings is enough for a first airport page, mixed with official lots. Fewer off-airport rows is not enough for launch. Zero invented rows is the hard rule.

## 4. Write a short intro

Mention which official lots you covered and how you chose the off-airport sample. Do not imply airport-wide coverage you did not research.

## 5. Build and check

```bash
npm run check
```

That command validates the JSON, builds the site, and fails if a required field is missing or an internal link is broken. If it passes, commit the new airport file (and the built site stays out of git).

## 6. After publish

Update `lastUpdated` on the airport file when listings change. On later nights, recrawl the oldest `lastChecked` dates before adding a second airport, so pages do not rot. Recheck official rates, shuttle instructions, and 24-hour claims especially; those are the details that drift. Never snapshot live prices or open spots into the JSON as if they were current.
