# Deployment

## The constraint that shapes everything

**A page served over HTTPS may not open `ws://` or `http://`.** Browsers block
it as mixed content, with no override and no user-facing exception.

GitHub Pages forces HTTPS. The relay on your network speaks plain HTTP. So:

> The GitHub Pages build **cannot connect to a real CRT**. It runs in simulation
> mode, which is a complete and useful thing, but it is not a remote control.

This is not a bug to be worked around. Certificates for a `.local` address are
not obtainable, self-signed ones make the browser refuse the socket anyway, and
tunnelling a LAN through a public host to satisfy a browser rule would be worse
in every way than the alternative.

**The alternative: serve this app from the relay.** The relay hosts static
files, so the phone loads it over plain HTTP from the Pi and everything is
same-origin and unblocked.

```bash
node ~/CRTHost/server/relay.mjs \
  --port 7890 \
  --host-dir   ~/CRTHost/dist \
  --remote-dir ~/CRTRemote/dist
```

Then open `http://<pi>:7890/remote/` on the phone and add it to the home screen.

`--remote-dir` serves this app under `/remote/`, which matches the `/CRTRemote/`
base path Vite builds with. If you change one, change the other.

The settings screen detects the HTTPS case and explains it, rather than letting
the connection fail with a network error the user cannot act on.

Both deployments are worth having:

| | GitHub Pages | Served from the relay |
|---|---|---|
| Reach | anywhere | your network |
| Controls a real CRT | no | yes |
| Simulator | yes | yes |
| Good for | showing it off, designing the UI | actually using it |

## GitHub Pages

`.github/workflows/deploy.yml` builds on every push to `main` and publishes
`dist/`.

**One-time setup:** Settings → Pages → Source: **GitHub Actions**. Until that is
done the workflow fails at `configure-pages` with *"Get Pages site failed"*. It
cannot be automated — the workflow's default token is not granted the
administration rights needed to create a Pages site, so `enablement: true` fails
with a less helpful error rather than working. Equivalent from the command line:

```bash
gh api -X POST repos/<owner>/CRTRemote/pages -f build_type=workflow
```

Re-run the failed workflow afterwards, or push again.

Two settings that matter:

- **`base: "./"`** in `vite.config.ts` — a *relative* base, so one build works
  from every mount point: `/CRTRemote/` on Pages, `/remote/` when the relay is
  serving it, and `file://`. An absolute base would pin it to one and 404 every
  asset in the others.
- **Hash routing.** `#/games` survives a hard refresh; `/games` would 404,
  because Pages has no rewrite rule to send unknown paths back to `index.html`.
  It is also what makes the relative base viable — the hash leaves the document
  path alone, so relative asset URLs keep resolving.

## Installing to the home screen

The manifest declares `display: standalone`, portrait, and matching theme
colours, so it opens without browser chrome. `viewport-fit=cover` plus the
safe-area insets mean it runs under the notch and the home indicator correctly.

Install it from the copy served by the relay, not the Pages one — a home-screen
icon that cannot reach the CRT is worse than no icon.

## Checklist

- [ ] `npm run check:protocol` passes against CRTHost
- [ ] `npm run build` clean
- [ ] Pages source set to GitHub Actions
- [ ] For real use: relay running with `--remote-dir`, phone on the same network
- [ ] `http://<pi>:7890/api/status` returns `{ hosts: 1, remotes: n }`
