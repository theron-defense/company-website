# Theron Company Website

Static site for GitHub Pages, styled with Tailwind CSS v4.

## Local preview

```bash
cd company-website
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## Styling (Tailwind)

Styles are authored as Tailwind utility classes in `index.html`. The compiled
stylesheet `css/styles.css` is committed, so GitHub Pages needs no build step.

To rebuild after changing classes or `src/input.css`:

```bash
# one-time: download the standalone Tailwind CLI (no Node required)
mkdir -p .tools
curl -sLo .tools/tailwindcss https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-macos-arm64
chmod +x .tools/tailwindcss

# compile
./.tools/tailwindcss -i src/input.css -o css/styles.css --minify

# or watch during development
./.tools/tailwindcss -i src/input.css -o css/styles.css --watch
```

Design tokens (brand colors, font) live in the `@theme` block of
`src/input.css`, along with the hero grid backdrop.

Dark mode uses Tailwind's `dark:` variant (class on `<html>`). A header
selector offers **Auto** (system), **Light**, and **Dark**; preference is
saved in `localStorage`.

## GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to deploy from the `main` branch, root (`/`).
4. Save — the site will be live at `https://<org>.github.io/company-website/`.

## Structure

- `index.html` — single-page site (Tailwind utility classes)
- `src/input.css` — Tailwind entry: theme tokens + hero grid CSS
- `css/styles.css` — compiled output (committed for Pages)
- `js/main.js` — mobile nav and header behavior
- `assets/logo.svg` — primary logo (SVG wrapper, embedded source artwork)
- `assets/logo-white.svg` — logo for dark backgrounds
- `assets/mark.png` — icon mark extracted from source (transparent)
- `assets/logo-full.png` — full logo extracted from source (transparent)
- `assets/favicon.svg` — favicon
