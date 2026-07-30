# Morgan Amos — Listings &amp; Reviews

KPDD added `Access-Control-Allow-Origin` to the `.rss` routes, so this is now a **single
static HTML file**. It fetches the four feeds straight from the browser — no relay, no
Cloudflare Function, no server code, nothing to maintain.

Verified July 30, 2026: all four feeds return 200 with valid RSS on a direct browser fetch.

## Deploy to Cloudflare Pages

Push `index.html` to your repo (at the repo root), then:

1. dash.cloudflare.com → Workers & Pages → **Create** → **Pages** → Connect to Git
2. Framework preset **None**, build command **blank**, output directory `/`
3. Save and Deploy

That's it. There's no `functions/` folder anymore — the earlier relay is deleted because
it's no longer needed.

## Embedding on the main site

Two options:

- **Copy it in.** Lift the `<style>`, the markup between `<header>` and `</footer>`, and
  the `<script>` into your existing page. It has no dependencies beyond the Google Fonts
  link, and no build step.
- **iframe it.** Point an iframe at the Pages URL (or a subdomain like
  `listings.morganamos.com` via Pages → Custom domains). Simplest if the main site is
  WordPress or a builder you'd rather not hand-edit.

## How it behaves

- Four tabs — Active, Pending, Closed, Reviews — with live item counts.
- Refreshes every 10 minutes, plus a manual Refresh button.
- Status dot: green = all four live, amber = partial, red = unreachable.
- Empty feeds show an honest per-tab message (pending is currently empty — that's the
  real feed state, not an error).
- Listings without a photo show a striped placeholder rather than a broken image.

## Feed field notes

- **active / pending / closed** — `title` is `Address — $Price`; `link`, `pubDate`, and
  usually an `enclosure` photo. One closed sale has no photo.
- **reviews** — `title` is `★★★★★ review from Name`, reviewer in `dc:creator`, full text
  in `description`, no photo. Read `dc:creator` with `getElementsByTagName` — the
  namespaced tag won't match a plain `querySelector`.
