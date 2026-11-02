# Deploying the Kalb Project Atlas to Vercel

The app is a static site (HTML/JS/CSS — no server), so Vercel hosts it for
free and redeploys automatically whenever the repo changes.

---

## Deploy readiness — verified

Checked against a clean clone, running exactly what Vercel runs
(`npm ci` → `npm run build`) on Node 22:

| Check | Result |
|---|---|
| `npm ci` from `package-lock.json` | 424 packages, no errors |
| `npm run build` (`tsc -b && vite build`) | passes, ~20 s |
| Build output | `dist/` — includes `data/`, `brand/`, `renders/`, `tools/` |
| `dist/data/projects.json` | present, served statically |
| Node version | pinned via `engines.node` `22.x` in package.json |
| Config | `vercel.json` present — framework, build command, output dir, cache headers |
| Secrets | `.env` is git-ignored; no token is committed |
| Hardcoded hosts | none — no `localhost` anywhere in `src/` or `public/` |
| Routing | hash-based (`#/project/…`), so no rewrite rules are needed |

### Build warnings you can ignore

Three show up in Vercel's build log and none of them need action:

- **"chunks larger than 500 kB"** — that's the Mapbox library. Expected, and
  harmless on a wall display over office wifi.
- **`npm warn deprecated esri-loader@3.7.0`** and **`jpeg-exif@1.1.4`** —
  neither is ours. Both arrive transitively through `deck.gl` →
  `@deck.gl/arcgis` / `@arcgis/core`, which comes along with deck.gl even
  though we only use its 3D-tiles layer. Removing them means dropping
  deck.gl, i.e. dropping the optional Google Photorealistic 3D Tiles view.
  Not worth it. Check `npm ls esri-loader jpeg-exif` to confirm.
- **`Export "WebGLDevice" … was reexported through module`** — a luma.gl
  packaging notice from the same dependency. Cosmetic.

### Project Settings vs vercel.json

Vercel may show *"Configuration Settings in the current Production deployment
differ from your current Project Settings"* on the Settings → Build page.
That's because `vercel.json` in this repo already declares the framework,
build command, and output directory, and the dashboard has an override
switched on for Output Directory as well.

`vercel.json` wins, so the banner is cosmetic — but keep the config in the
repo, not the dashboard: **Settings → Build and Deployment → turn the
Output Directory *Override* toggle off** and leave every other override off
too. Then there is exactly one place that defines how this site builds.

---

## One-time setup

### 1. Create the Vercel account
Go to [vercel.com/signup](https://vercel.com/signup) and sign up **with
GitHub** using the Kalb account that can see `kalb-ai/kalb-projects-wall-map`.
Choose the **Hobby (free)** plan — a static site like this stays free.

### 2. Import the repository
1. Vercel dashboard → **Add New… → Project**.
2. Find **kalb-projects-wall-map** → **Import**. (If it isn't listed, click
   *Adjust GitHub App Permissions* and grant access to the repo.)
3. Vercel reads `vercel.json` and fills in the settings itself:
   - Framework: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`

### 3. Add the environment variable
Still on the import screen (or later under **Settings → Environment
Variables**), add:

| Name | Value | Environments |
|---|---|---|
| `VITE_MAPBOX_TOKEN` | `pk.…` (from account.mapbox.com) | Production, Preview, Development |

Without the Mapbox token the site still works — it falls back to the free map
engine — but with it you get the smooth vector map, 3D city view, and
lighting presets.

#### Restricting the Mapbox token
The token is compiled into the public JavaScript bundle. That is normal and
unavoidable for a browser map: `pk.` tokens are designed to be public, and no
amount of hiding changes that. What stops someone else spending your quota is
a **URL restriction**, which ties the token to your domain.

The **Default public token cannot be restricted** — that is why the option
looks missing. Create a new one instead:

1. Mapbox → **Access tokens** → **Create a token**
2. Name it `kalb-wall-map`, leave the default public scopes
3. Under **URL restrictions**, add:
   - `https://kalb-projects-wall-map.vercel.app`
   - `http://localhost:5173` (only if you build locally)
4. Create it, put the new value in `VITE_MAPBOX_TOKEN`, redeploy
5. Back in Mapbox, **delete the old token** — rotation is not finished until
   the old one stops working

### Running it in a TV's own browser

The wall was tuned on a PC driving a TV. A smart TV's built-in browser is
a different class of hardware — a phone-grade GPU asked to render a 3D
vector map at 1080p — and two things go wrong there:

**It stutters.** Add `?lite=1`:

```
https://kalb-projects-wall-map.vercel.app/?lite=1
```

Lite mode renders at 1× instead of 1.5× (2.25× fewer pixels a frame),
flattens the camera so no 3D building geometry is drawn, drops the idle
orbit and the heat layer, and stops all CSS animation and shadow work.
Every project, photo and fact is still there. The app also measures its
own frame rate and switches to lite by itself after five sustained
seconds below 26 fps, so a weak panel degrades without anyone noticing;
`?lite=0` refuses that if you would rather have the full version.

**Nothing responds to the remote.** Fixed — TV browsers drive their
cursor with legacy mouse events and never fire Pointer Events, so the app
saw no activity at all: the cursor stayed hidden and the auto tour flew
the camera out from under every attempted click.

A PC driving the panel is still much better if one is available. It gets
the full 3D map, the orbit and a real 60 fps, and `kiosk/kalb-atlas-kiosk.bat`
only exists for that setup.

### Access — public by decision

The site is deliberately **public**: anyone with the URL sees the map and the
project data. An access gate (secret link + cookie) was built and abandoned —
three routing-layer attempts failed to hold on Vercel's edge network, and the
gate also broke the one thing the wall needs most: the display and the
installed app loading unattended. The decision (Aug 2026) was that a lobby
display already shows this data to every visitor, so the URL staying quiet is
enough.

What still stands from that work:

- **Search engines are blocked three ways** — `robots.txt`, a `noindex` meta
  tag, and an `X-Robots-Tag` header — so the site never turns up in Google.
  Only someone given the URL finds it.
- **The Mapbox token is URL-restricted** (see above), so the only real secret
  in the bundle is useless off this domain.

`SITE_KEY` in Vercel is no longer read by anything; it can be deleted.

If real access control is ever wanted, the honest options are Vercel's paid
Password Protection, or hosting inside the office network instead
(`npm run build` + `npm run kiosk` on the Mac Mini).

### 4. Deploy
Click **Deploy**. First build takes ~1–2 minutes and you get a URL like
`kalb-projects-wall-map.vercel.app`.

### 5. Branch — nothing to do
Vercel builds the repository's **default branch**, and this repo's default
branch is already `claude/kalb-construction-wall-map-4ifnh8` (it is the only
branch). So the import picks up the right code with no settings change.

If the repo ever gains a `main` branch and that becomes the default, set
**Settings → Git → Production Branch** back to whichever branch holds the
live map.

---

## Decide who can see it

A plain Vercel deployment is **public** — anyone with the URL sees every
Kalb job number, address, and team. If that's not acceptable, pick one:

- **Vercel Password Protection** (Settings → Deployment Protection) — one
  shared password for the whole site. Requires a paid plan.
- **Keep it internal** — don't deploy publicly; run the kiosk from the
  office machine (`npm run build` + `npm run kiosk`) as before.
- **Accept it** — the data is project names and street addresses, i.e.
  things already visible on the buildings themselves.

Confirm this with Kalb before sharing the link widely.

---

## How updates reach every screen

Nobody has to restart anything.

**A window that is already open** — the lobby display, or an installed
desktop app left running — polls `version.json` every 15 minutes. That file
carries the build's content hash, so it changes when the code changes and
*doesn't* when a redeploy produces identical output. When it changes, the
page reloads **the next time the screen is idle**, so a reload can never
interrupt somebody mid-look. A machine waking from sleep checks immediately
rather than waiting out the interval.

**A fresh launch** is handled by cache headers in `vercel.json`:
`index.html`, `manifest.webmanifest` and `version.json` are `no-cache`
(revalidated every time), while the hashed files under `/assets` are
`immutable` — they can be cached forever because a new build gives them new
filenames.

**Project data** (`data/projects.json`, `data/teams.json`) is `no-store` and
read at load, so a data edit shows up on the next refresh — no rebuild, and
the same idle-reload picks it up on the wall within 15 minutes.

The installed desktop app is just Chrome pointed at the same URL, so all of
the above applies to it identically. There is no separate copy to update.

---

## Updating content after launch

Because the app reads `data/projects.json` and `data/teams.json` at runtime,
updating the wall map is a text edit — but on Vercel it goes through GitHub
rather than the kiosk's hard drive:

1. GitHub → `kalb-projects-wall-map` → `public/data/projects.json` → pencil icon.
2. Edit (add a project, fix a pin, assign a team) → **Commit changes**.
3. Vercel rebuilds in about a minute; refresh the wall display.
4. Check it actually happened: Vercel → kalb-projects-wall-map →
   **Deployments** should show a new build for your commit. If it does not,
   the wall has not changed, however long you wait.

**Keep the repository at `kalb-ai/kalb-projects-wall-map`.** That is the
GitHub account Vercel is connected to. In autumn 2026 the repo was moved to
the `kalb-construction` organization and Vercel silently stopped building:
no error and no failed deploy, just no deploys at all from 1 Sep to 2 Nov,
while the wall kept showing the 1 Sep data. It was moved back on 2 Nov
2026. If it ever has to move, reconnect the Vercel project to the new
location in the same sitting and confirm a build appears.

The `/tools/coords.html` page works on the deployed site too — open
`https://<your-vercel-url>/tools/coords.html`, correct pins, download the
patched `projects.json`, and upload it to GitHub the same way.


