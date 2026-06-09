# Theron Company Website

Static site for GitHub Pages.

## Local preview

```bash
cd company-website
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to deploy from the `main` branch, root (`/`).
4. Save — the site will be live at `https://<org>.github.io/company-website/`.

## Structure

- `index.html` — single-page site
- `css/styles.css` — styles
- `js/main.js` — mobile nav and header behavior
- `assets/logo.svg` — primary logo (SVG wrapper, embedded source artwork)
- `assets/logo-white.svg` — logo for dark backgrounds
- `assets/mark.png` — icon mark extracted from source (transparent)
- `assets/logo-full.png` — full logo extracted from source (transparent)
- `assets/favicon.svg` — favicon
