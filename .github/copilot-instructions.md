# Copilot Instructions — HardwareTest

These concise instructions help an AI coding agent become productive in this repository (a static, multi-lingual hardware diagnostic website).

**Big Picture**
- **Codebase type:** Static website (no build system). Content is plain HTML, CSS and JS organized by locale and URL path.
- **Primary folders:** `en/`, `zh/` — each page lives as `index.html` inside a directory that maps to the URL path. Shared assets live under `static/` and `js/`.
- **Key examples:** homepage at [en/index.html](en/index.html#L1) and shared layout in [static/css/shared/document.css](static/css/shared/document.css).

**Architecture & Dataflow**
- Pages are static HTML that load small, page-scoped JavaScript from `js/` (e.g. `js/toolbox/*`, `js/input-stress-test/*`). JS modules manipulate the DOM and use browser APIs (Web Audio, Canvas, high-resolution timers) to run tests locally — there is no server-side logic.
- Audio/video/camera tests rely on the Web Audio and MediaDevices APIs (see examples in `js/toolbox/mic/` and `js/toolbox/camera/`). Screen and pixel tests use Canvas/CSS full-screen techniques (see `en/toolbox/dead-pixel/index.html`).

**Developer workflows**
- There is no build step. Edit HTML under `en/` or `zh/`, put CSS in `static/` and JS in `js/`, then serve the folder with a static server for testing.
- Quick local preview (recommended):

  - Python: `python -m http.server 8080`
  - Node: `npx http-server . -p 8080`

- After content changes, update sitemap files in the repo root (`sitemap*.xml`) if adding or removing pages.

**Project-specific conventions**
- Directory-per-page: every navigable page is an `index.html` inside a folder matching its URL (e.g., `en/toolbox/mouse/index.html`). Follow this when adding new tools.
- Locale parity: add both `en/` and `zh/` equivalents for visible pages when possible; translations are stored in `README.md` and `README.zh-CN.md` and mirrored in the site structure.
- Asset mirroring: CSS lives under `static/css/<area>/` and JS under `js/<area>/`. When adding a page, add matching CSS/JS under the corresponding subfolders.
- Naming pattern: pages often have paired JS files `*-en.js` and `*-zh.js` for language-specific behavior (see `js/home-en.js` and `js/home-zh.js`).

**Integration points & external deps**
- No package.json or node tooling in the repo — dependencies are browser APIs only. Assume modern browser features are used (Web Audio, MediaDevices, Canvas, high-resolution timers).
- Deployments are plain static hosts (S3, Netlify, GitHub Pages, custom server). Updating sitemaps and `site.webmanifest` may be necessary on deploy.

**When modifying or adding a tool** (check these files when changing pages):
- Add page HTML: `en/<tool>/index.html` and `zh/<tool>/index.html`.
- Add JS: `js/<tool>/` — follow existing structure (see `js/toolbox/` and `js/input-stress-test/`).
- Add CSS: `static/css/<area>/` or `static/css/shared/` for common styles.
- Update sitemap(s): `sitemap.xml` and `sitemap-main.xml` (root) so crawlers discover new pages.

**Examples to inspect when implementing changes**
- Entry structure: [en/index.html](en/index.html#L1)
- Shared JS patterns: [js/shared/switchlanguage.js](js/shared/switchlanguage.js)
- CSS layout: [static/css/shared/document.css](static/css/shared/document.css)
- Tool page pattern: [en/toolbox/mouse/index.html](en/toolbox/mouse/index.html#L1)

**What the AI should avoid guessing**
- Do not assume any server-side APIs or Node tooling exists. If a task requires a build step or packaging, ask the user before adding new tooling.

If anything here is incomplete or you want additional examples (e.g., specific JS test modules or exact sitemap editing rules), tell me which area to expand and I will update this file.
