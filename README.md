# China Mainland Province Data Visualizer

An interactive static web app for exploring mainland Chinese province-level data from 2016 to 2025. The app renders a D3 choropleth map with dataset and year controls, hover tooltips, and a selected-province detail panel.

## Datasets

- Disposable income per capita
- Consumption expenditure per capita
- Natural growth rate

## Project Structure

```text
.
├── index.html
├── china_province_panel_2016_2025.csv
├── data/
│   └── china-provinces.geojson
├── src/
│   ├── app.js
│   └── styles.css
└── vendor/
    └── d3.v7.min.js
```

## Run Locally

Because the app loads local CSV and GeoJSON files with `fetch`, serve the folder with a local web server instead of opening `index.html` directly.

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy To Vercel

This is a static site and does not require a build step.

Recommended Vercel settings:

- Framework Preset: Other
- Build Command: leave blank
- Output Directory: leave blank or `.`
- Install Command: leave blank

Import the GitHub repository into Vercel and deploy. Vercel will serve `index.html` from the project root.

## Embed In Another Site

If this project is deployed separately from a main website, embed it with an iframe:

```html
<iframe
  src="https://your-visualizer-project.vercel.app"
  title="China Mainland Province Data Visualizer"
  style="width: 100%; height: 900px; border: 0;"
  loading="lazy"
></iframe>
```

