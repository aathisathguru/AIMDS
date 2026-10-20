# AIMDS SEO and production notes

The frontend now includes route-aware titles and descriptions, canonical URLs when `VITE_SITE_URL` is configured, Open Graph and Twitter metadata, JSON-LD breadcrumbs, LocalBusiness schema, a branded 404 page, a favicon, `robots.txt`, `sitemap.xml`, `llms.txt`, a social preview image, and the synchronized `manus-routes.json` route manifest.

## Configure the real public origin

Before a real deployment, set the actual HTTPS origin in `frontend/.env.local` or the host's build environment:

```dotenv
VITE_SITE_URL=https://your-real-domain.example
```

The app intentionally does not guess a canonical domain. The current Manus task/preview URL is not a stable production origin, so it should not be used as a long-lived canonical URL.

## Indexing policy

AIMDS is an authenticated operations console. Monitoring, telemetry, alerts, reports, and settings routes use `noindex, nofollow` and are excluded from the public sitemap so private operational data is not promoted to search engines. If a separate public marketing site is added later, it should live on public routes with its own content, titles, canonical URLs, and sitemap entries.

## Production checks already applied

- Browser title no longer references Vite or React.
- Production builds emit zero source maps.
- Every rendered `<img>` has descriptive alt text.
- The route manifest uses clean route slugs and unique titles.
- The build includes the favicon, social card, crawler files, and `llms.txt`.
- The custom 404 has one clear H1 and route-aware not-found metadata.
- Frontend build passes; lint passes with five pre-existing non-blocking style warnings.
