import type { MetadataRoute } from "next";

// Every <Link> in the catalogue prefetches its RSC payload, and those `?_rsc=` URLs are useless
// to crawlers and to us. Worse, a burst of them looks like a crawl to a WAF: CrowdSec's
// http-crawl-non_statics scenario banned the site owner's own IP over exactly this pattern on
// 2026-10-18. Card pages themselves stay indexable - only the prefetch/RSC URLs are closed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/*?_rsc=", "/api/", "/data/"],
      },
    ],
  };
}
