// Cloudflare Pages Function — serves GET /api/feed?feed=active|pending|closed|reviews
//
// File location IS the route: functions/api/feed.js -> /api/feed
// No config file needed. Runs on Cloudflare's network, so requests to kpdd.com
// originate from Cloudflare IPs rather than the AWS ranges Netlify used (which
// kpdd.com's Cloudflare rules rejected with a hard 403).

const BASE = "https://kpdd.com/agents/morganamos/";
const FEEDS = {
  active: "active.rss",
  pending: "pending.rss",
  closed: "closed.rss",
  reviews: "reviews.rss"
};

const TTL = 600; // seconds

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://kpdd.com/agents/morganamos",
  "Sec-Ch-Ua": '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1"
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "x-feed-source, x-feed-warning, x-feed-status"
};

// A Cloudflare interstitial is HTML, not RSS. Never parse it, never cache it.
function isChallenge(text) {
  const head = text.slice(0, 600).toLowerCase();
  if (head.includes("just a moment")) return true;
  if (head.includes("challenges.cloudflare.com")) return true;
  if (head.includes("cf-browser-verification")) return true;
  return !/<rss|<\?xml/i.test(head);
}

function json(status, payload) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS }
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const key = (url.searchParams.get("feed") || "").toLowerCase();

  if (!FEEDS[key]) {
    return json(400, { error: "unknown_feed", allowed: Object.keys(FEEDS) });
  }

  const target = BASE + FEEDS[key];
  const cache = caches.default;
  const cacheKey = new Request(target, { method: "GET" });

  const hit = await cache.match(cacheKey);
  if (hit) {
    return new Response(await hit.text(), {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "x-feed-source": "cache",
        ...CORS
      }
    });
  }

  try {
    const res = await fetch(target, { headers: BROWSER_HEADERS });
    const text = await res.text();

    if (!res.ok || isChallenge(text)) {
      return json(502, {
        error: res.ok ? "cloudflare_challenge" : "upstream_" + res.status,
        upstreamStatus: res.status,
        feed: target,
        hint:
          res.status === 403
            ? "Cloudflare blocked this request from Cloudflare's own network too. Nothing further can be done from your side \u2014 KPDD has to add Access-Control-Allow-Origin to the .rss routes or a WAF skip rule for those paths. See README."
            : "kpdd.com returned an HTML challenge page instead of RSS.",
        preview: text.slice(0, 300)
      });
    }

    const out = new Response(text, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=" + TTL,
        "x-feed-source": "live",
        "x-feed-status": String(res.status),
        ...CORS
      }
    });
    context.waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  } catch (e) {
    return json(502, { error: "fetch_failed", message: String((e && e.message) || e), feed: target });
  }
}
