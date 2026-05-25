# Chinese Provinces Data Visualizer Spec

## 1. Project Goal

Build an interactive map-based data visualizer for Chinese provincial-level regions that can be embedded as a subproject in a personal website. The app should let users choose a dataset, see provinces color-coded by value, hover provinces for quick context, and click provinces to open province-specific dataset details.

Initial datasets:

- Per capita disposable income
- Per capita consumption expenditure
- Per capita natural growth rate

All datasets are province-level.

## 2. Recommended Technical Approach

### Primary Recommendation

Use **TypeScript + React**, ideally inside a **Vite** app or a **Next.js** route depending on the structure of the personal website.

If the personal website is already Next.js, build this as a route such as:

```text
/projects/china-province-visualizer
```

If the site is static or framework-agnostic, build this as a standalone Vite app that can be exported and embedded/deployed under a subpath.

### Why TypeScript + React

- Strong fit for interactive UI state: selected dataset, selected province, hover state, legends, panels.
- Easy to embed into a modern personal site.
- TypeScript helps keep province IDs, dataset fields, and map data consistent.
- Strong ecosystem for maps, charts, and data visualization.

### Mapping Library

Use **D3 Geo** for rendering and projection, with React controlling UI state.

Recommended packages:

- `d3-geo` for geographic projection and path generation
- `d3-scale` for color scales
- `topojson-client` if using TopoJSON map data
- Optional: `framer-motion` for polished province hover/click transitions

Avoid full map engines like Mapbox or Leaflet unless you need slippy-map behavior, zoom tiles, street labels, or geographic search. For a clean province choropleth, SVG with D3 is lighter, sharper, and easier to style.

## 3. Core User Experience

### First Screen

The first screen should be the visualizer itself, not a landing page.

Recommended layout:

- Top toolbar with dataset selector
- Main China province map
- Right or bottom detail panel depending on viewport
- Legend showing data range and color scale
- Small source/year indicator

Desktop layout:

```text
--------------------------------------------------
| Dataset selector | Year/source notes            |
--------------------------------------------------
|                                                ||
|                 China Map                      || Province detail
|                                                || panel
|                                                ||
--------------------------------------------------
| Legend                                           |
--------------------------------------------------
```

Mobile layout:

```text
-----------------------------
| Dataset selector           |
-----------------------------
| China Map                  |
-----------------------------
| Legend                     |
-----------------------------
| Selected province details  |
-----------------------------
```

### Map Behavior

Each province should:

- Be color-coded based on the currently selected dataset.
- Show hover feedback.
- Slightly expand or lift on hover.
- Show a tooltip with province name, value, rank, and unit.
- Be clickable.

Click behavior:

- Selects the province.
- Opens or updates the detail panel.
- Detail panel shows all available datasets for that province, not only the currently active dataset.
- URL can optionally update with province and dataset query params for shareability.

Recommended query format:

```text
?dataset=disposable-income&province=guangdong
```

### Hover Expansion

For SVG maps, true geographic expansion can be visually messy because provinces share borders. The safer polished version is:

- Keep the province path shape the same.
- On hover, apply:
  - slightly stronger fill
  - raised `z-index` equivalent by rendering hovered province last
  - subtle transform scale around province centroid
  - stroke highlight
  - shadow/filter if visually restrained

This will create the feeling of expansion without distorting the full map.

## 4. Data Model

Use normalized province IDs shared between geographic data and statistical data.

Example:

```ts
type ProvinceId =
  | "beijing"
  | "tianjin"
  | "hebei"
  | "shanxi"
  | "inner-mongolia"
  | "liaoning"
  | "jilin"
  | "heilongjiang"
  | "shanghai"
  | "jiangsu"
  | "zhejiang"
  | "anhui"
  | "fujian"
  | "jiangxi"
  | "shandong"
  | "henan"
  | "hubei"
  | "hunan"
  | "guangdong"
  | "guangxi"
  | "hainan"
  | "chongqing"
  | "sichuan"
  | "guizhou"
  | "yunnan"
  | "tibet"
  | "shaanxi"
  | "gansu"
  | "qinghai"
  | "ningxia"
  | "xinjiang";
```

Dataset record:

```ts
type ProvinceMetric = {
  provinceId: ProvinceId;
  year: number;
  disposableIncomePerCapita: number | null;
  consumptionExpenditurePerCapita: number | null;
  naturalGrowthRatePerCapita: number | null;
};
```

Dataset metadata:

```ts
type DatasetDefinition = {
  id: string;
  label: string;
  field: keyof ProvinceMetric;
  unit: string;
  description?: string;
  source?: string;
  year: number;
  colorScale: "sequential" | "diverging";
};
```

## 5. Geographic Data

Use a China provincial boundary GeoJSON or TopoJSON file. Prefer TopoJSON for smaller bundle size.

Important requirements:

- Boundaries must match province-level regions.
- Each feature must include a stable ID that can map to `ProvinceId`.
- Simplify geometry enough for web performance while preserving recognizable borders.
- Decide whether to include Hong Kong, Macau, and Taiwan. The initial dataset list says provinces, but Chinese statistical datasets may handle these differently or omit them.

Recommended local file:

```text
src/data/china-provinces.topojson
```

Recommended mapping helper:

```text
src/data/province-id-map.ts
```

## 6. Visual Encoding

### Color Scales

For income and consumption expenditure:

- Use a sequential scale.
- Low values: light neutral or pale blue.
- High values: deep blue/green.

For natural growth rate:

- Use a diverging scale if values can be negative.
- Negative values: muted red/orange.
- Near zero: light neutral.
- Positive values: green/blue.

### Legend

The legend should update when the dataset changes.

Include:

- Minimum value
- Maximum value
- Unit
- Optional midpoint for diverging scale
- Missing data treatment

Missing data should use a neutral gray fill and show "No data" in tooltip.

## 7. Province Detail Panel

When a province is selected, show:

- Province name
- Current selected dataset value
- Rank among provinces for selected dataset
- All available dataset values
- Optional mini comparison chart
- Optional source/year note

Initial panel fields:

```text
Guangdong

Disposable income per capita
Value: ¥...
Rank: ...

All metrics
Disposable income: ...
Consumption expenditure: ...
Natural growth rate: ...
```

Future-friendly additions:

- Time series chart if multiple years are added
- Compare with national average
- Compare with another province
- Export selected data as CSV

## 8. App Structure

Recommended file structure:

```text
src/
  app/
    ChinaProvinceVisualizer.tsx
  components/
    DatasetSelector.tsx
    ChinaMap.tsx
    MapLegend.tsx
    ProvinceTooltip.tsx
    ProvinceDetailPanel.tsx
  data/
    china-provinces.topojson
    province-metrics.json
    province-id-map.ts
    datasets.ts
  lib/
    colorScales.ts
    formatters.ts
    rankings.ts
    topojson.ts
  styles/
    visualizer.css
```

If using Next.js App Router:

```text
app/projects/china-province-visualizer/page.tsx
components/china-visualizer/...
data/china-visualizer/...
```

## 9. Accessibility

The map should not be mouse-only.

Requirements:

- Provinces should be keyboard-focusable.
- Focus state should match hover state.
- Pressing Enter or Space should select a province.
- Tooltip content should also be represented in the detail panel or accessible labels.
- Dataset selector should be a native select, segmented control, or accessible radio group.
- Color should not be the only cue; tooltip, legend, and detail panel must show numeric values.

## 10. Responsiveness

Desktop:

- Map and panel side by side.
- Tooltip follows pointer but stays within viewport.

Tablet:

- Map full width, panel below or collapsible side drawer.

Mobile:

- Dataset selector stays above map.
- Map supports tap selection.
- Detail panel appears below map.
- Hover behavior becomes tap/focus behavior.

## 11. Performance

Targets:

- Initial JS bundle should stay modest.
- Map interaction should feel instant.
- Province hover should not cause full app re-render if avoidable.

Implementation notes:

- Memoize generated SVG paths.
- Precompute province centroids if needed.
- Use TopoJSON and simplified geometry.
- Keep dataset JSON small and normalized.

## 12. Data Sources

Potential sources:

- National Bureau of Statistics of China
- China Statistical Yearbook
- Provincial statistical yearbooks
- Public datasets derived from official statistical releases

Each dataset should track:

- Source name
- Source URL or citation
- Year
- Unit
- Retrieval date
- Notes on missing or adjusted values

Recommended source metadata:

```json
{
  "id": "disposable-income-per-capita",
  "label": "Per capita disposable income",
  "year": 2023,
  "unit": "CNY/person",
  "source": "China Statistical Yearbook",
  "sourceUrl": "",
  "notes": ""
}
```

## 13. Open Product Questions

These decisions should be made before implementation:

1. Should the map include only mainland provincial-level regions, or also Hong Kong, Macau, and Taiwan?
2. Should datasets be single-year only at first, or should the app support year selection from the beginning?
3. Do you want values to be sourced manually from CSV/JSON, or fetched from an API/build-time data pipeline?
4. Should clicking a province open an in-page detail panel, a modal, or a dedicated route?
5. Should province names be shown in English, Chinese, or both?
6. Should the visualizer inherit the personal website's styling exactly, or have its own self-contained visual identity?
7. Do you want this optimized for embedding in an existing page, or as a standalone project page?

## 14. Recommended MVP

The first usable version should include:

- Interactive SVG China province map
- Dataset selector for the three initial datasets
- Color-coded choropleth rendering
- Hover/tap tooltip
- Click-to-select province detail panel
- Legend
- Responsive layout
- Static local JSON dataset
- Source/year metadata

MVP does not need:

- Backend API
- User accounts
- Map tile server
- Province search
- Multi-year animation
- Export tools

## 15. Suggested Build Phases

### Phase 1: Foundation

- Choose Vite or Next.js integration target.
- Add province GeoJSON/TopoJSON.
- Create normalized province ID mapping.
- Add placeholder dataset JSON.
- Render static SVG map.

### Phase 2: Choropleth

- Add dataset selector.
- Implement color scales.
- Add legend.
- Format values and units.
- Handle missing data.

### Phase 3: Interaction

- Add hover/focus styles.
- Add tooltip.
- Add click selection.
- Add detail panel.
- Add keyboard accessibility.

### Phase 4: Polish

- Add responsive layout.
- Add transitions.
- Add rankings.
- Add source notes.
- Tune colors and map projection.

### Phase 5: Website Integration

- Mount under personal website route or subpath.
- Confirm base path and asset paths work.
- Match site typography and spacing.
- Deploy and verify production behavior.

## 16. Preferred Implementation Decision

Unless the personal website already strongly dictates another stack, build this with:

```text
TypeScript + React + Vite + SVG/D3
```

If the personal website is Next.js, use:

```text
TypeScript + React + Next.js App Router + SVG/D3
```

The map should be rendered as SVG, not canvas, for the MVP. SVG gives better accessibility, simpler province click handling, cleaner hover states, and easier styling.

