# Morgan Amos RSS — Cloudflare Pages via GitHub

Same relay as the Netlify test, moved to Cloudflare. Netlify returned **403 on all four
feeds** because Netlify Functions run on AWS Lambda and kpdd.com's Cloudflare rules
reject those datacenter IPs outright. Cloudflare Pages Functions run on Cloudflare's own
network, which is scored differently against a Cloudflare-protected origin.

No build step, no dependencies, no config file. The folder layout *is* the config.

## 1. Push to GitHub

Create a new repo (private is fine), then from inside this folder:

```
git init
git add .
git commit -m "Morgan Amos RSS relay"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

Or just drag these files into a new repo via github.com's web upload — there's nothing
here that needs a local git client.

## 2. Connect it to Cloudflare Pages

1. **dash.cloudflare.com** → Workers & Pages → **Create** → **Pages** tab → **Connect to Git**
2. Authorize GitHub, pick the repo.
3. Build settings — leave everything empty:
   - Framework preset: **None**
   - Build command: *(blank)*
   - Build output directory: `/`
4. **Save and Deploy.**

Cloudflare auto-detects `functions/api/feed.js` and wires it to `/api/feed`. Every push
to `main` redeploys.

## 3. Test the endpoint directly

Before even looking at the page, hit the function in your browser:

```
https://YOUR-PROJECT.pages.dev/api/feed?feed=active
```

- **RSS XML appears** → it works. Open `https://YOUR-PROJECT.pages.dev` and the board
  is live with all four feeds.
- **JSON with `"error": "upstream_403"`** → Cloudflare's own network is blocked too.
  You've exhausted your side of the problem; go to step 4.

The board's diagnostics panel shows the same per-feed status: **live** (green), **cache**
(amber), **error** (red).

## 4. If it's still 403 — send this to KPDD

> Hi — I'm syndicating my agent RSS feeds onto my own website:
> https://kpdd.com/agents/morganamos/active.rss (plus pending, closed, reviews).
>
> The feeds are valid and load fine in a browser, but they can't be consumed
> programmatically. Two things block it:
>
> 1. The `.rss` routes don't send an `Access-Control-Allow-Origin` header, so a browser
>    can't read them cross-origin from my domain.
> 2. Cloudflare returns **403** to server-side requests from cloud hosting — I've tested
>    from both AWS (Netlify) and Cloudflare's own network.
>
> Could you add `Access-Control-Allow-Origin: *` to the `.rss` routes, or a Cloudflare
> WAF skip rule for those paths? These feeds exist for syndication, so I assume the block
> is unintended. Happy to provide my domain or IP to allow-list if that's easier.

The CORS header is the better outcome — it removes the need for any relay at all.

## Files

- `index.html` — the board. Plain HTML/CSS/JS, fetches `/api/feed?feed=…`.
- `functions/api/feed.js` — the relay. Browser headers, 10-min edge cache, challenge
  detection; never caches or parses an HTML challenge page.

## Custom domain

Pages project → **Custom domains** → add e.g. `listings.yourdomain.com`. If you later
embed this on your main site, an iframe pointing at that subdomain is the simplest path;
otherwise copy `index.html`'s markup in and keep `/api/feed` reachable from that origin.
