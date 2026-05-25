const DATASETS = [
  {
    id: "none",
    label: "No dataset",
    unit: "",
    kind: "neutral",
  },
  {
    id: "disposable_income_per_capita",
    label: "Disposable income per capita",
    unit: "CNY/person",
    kind: "sequential",
  },
  {
    id: "consumption_expenditure_per_capita",
    label: "Consumption expenditure per capita",
    unit: "CNY/person",
    kind: "sequential",
  },
  {
    id: "natural_growth_rate",
    label: "Natural growth rate",
    unit: "per mille",
    kind: "diverging",
  },
];

const GEO_NAME_TO_PROVINCE_ID = {
  Anhui: "anhui",
  Beijing: "beijing",
  Chongqing: "chongqing",
  Fujian: "fujian",
  Gansu: "gansu",
  Guangdong: "guangdong",
  Guangxi: "guangxi",
  Guizhou: "guizhou",
  Hainan: "hainan",
  Hebei: "hebei",
  Heilongjiang: "heilongjiang",
  Henan: "henan",
  Hubei: "hubei",
  Hunan: "hunan",
  Jiangsu: "jiangsu",
  Jiangxi: "jiangxi",
  Jilin: "jilin",
  Liaoning: "liaoning",
  Neimenggu: "inner_mongolia",
  Ningxia: "ningxia",
  Qinghai: "qinghai",
  Shaanxi: "shaanxi",
  Shandong: "shandong",
  Shanghai: "shanghai",
  Shanxi: "shanxi",
  Sichuan: "sichuan",
  Tianjin: "tianjin",
  Xinjiang: "xinjiang",
  Xizang: "xizang",
  Yunnan: "yunnan",
  Zhejiang: "zhejiang",
};

const MAINLAND_PROVINCE_IDS = new Set(Object.values(GEO_NAME_TO_PROVINCE_ID));

const dom = {
  svg: d3.select("#china-map"),
  datasetSelect: document.querySelector("#dataset-select"),
  yearSelect: document.querySelector("#year-select"),
  mapTitle: document.querySelector("#map-title"),
  mapSubtitle: document.querySelector("#map-subtitle"),
  dataStatus: document.querySelector("#data-status"),
  legend: document.querySelector("#legend"),
  tooltip: document.querySelector("#tooltip"),
  provinceTitle: document.querySelector("#province-title"),
  provinceSummary: document.querySelector("#province-summary"),
  metricList: document.querySelector("#metric-list"),
};

const state = {
  rows: [],
  geojson: null,
  selectedDataset: "none",
  selectedYear: null,
  selectedProvinceId: null,
  hoveredProvinceId: null,
};

init();

async function init() {
  try {
    const [csvText, geojson] = await Promise.all([
      fetch("./china_province_panel_2016_2025.csv").then((response) =>
        response.text(),
      ),
      fetch("./data/china-provinces.geojson").then((response) =>
        response.json(),
      ),
    ]);

    state.rows = d3.csvParse(csvText, parseMetricRow);
    state.geojson = geojson;
    state.selectedYear = getLatestYearWithData(state.rows);

    setupControls();
    render();
    dom.dataStatus.textContent = "Ready";
  } catch (error) {
    dom.dataStatus.textContent = "Load error";
    dom.mapSubtitle.textContent =
      "Could not load the CSV or province geometry. Use a local server rather than opening the file directly.";
    console.error(error);
  }
}

function parseMetricRow(row) {
  return {
    province_id: row.province_id,
    province_name_en: row.province_name_en,
    province_name_zh: row.province_name_zh,
    year: Number(row.year),
    disposable_income_per_capita: parseNullableNumber(
      row.disposable_income_per_capita,
    ),
    consumption_expenditure_per_capita: parseNullableNumber(
      row.consumption_expenditure_per_capita,
    ),
    natural_growth_rate: parseNullableNumber(row.natural_growth_rate),
  };
}

function parseNullableNumber(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  return Number(value);
}

function setupControls() {
  dom.datasetSelect.innerHTML = DATASETS.map(
    (dataset) => `<option value="${dataset.id}">${dataset.label}</option>`,
  ).join("");
  dom.datasetSelect.value = state.selectedDataset;

  const years = Array.from(new Set(state.rows.map((row) => row.year))).sort(
    (a, b) => b - a,
  );
  dom.yearSelect.innerHTML = years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
  dom.yearSelect.value = String(state.selectedYear);

  dom.datasetSelect.addEventListener("change", (event) => {
    state.selectedDataset = event.target.value;
    render();
  });

  dom.yearSelect.addEventListener("change", (event) => {
    state.selectedYear = Number(event.target.value);
    render();
  });
}

function getLatestYearWithData(rows) {
  const rowsWithData = rows.filter((row) =>
    DATASETS.filter((dataset) => dataset.id !== "none").some((dataset) =>
      Number.isFinite(row[dataset.id]),
    ),
  );
  return d3.max(rowsWithData, (row) => row.year) ?? d3.max(rows, (row) => row.year);
}

function render() {
  const dataset = getSelectedDataset();
  const rowsForYear = getRowsForSelectedYear();
  const values =
    dataset.id === "none"
      ? []
      : rowsForYear
          .map((row) => row[state.selectedDataset])
          .filter((value) => Number.isFinite(value));
  const color = createColorScale(dataset, values);
  const rowByProvince = new Map(
    rowsForYear.map((row) => [row.province_id, row]),
  );

  dom.mapTitle.textContent = dataset.label;
  dom.mapSubtitle.textContent =
    dataset.id === "none"
      ? "Click a province to explore its data"
      : `${state.selectedYear} - ${dataset.unit}`;

  renderMap(rowByProvince, color);
  renderLegend(dataset, values, color);
  renderDetail(rowByProvince);
}

function renderMap(rowByProvince, color) {
  const width = 960;
  const height = 720;
  const mainlandAndContext = getMainlandFeatures();
  const scale = 13.8;
  const projection = d3
    .geoIdentity()
    .reflectY(true)
    .scale(scale)
    .translate([width / 2 - scale * 104.3, height / 2 + scale * 35.75]);
  const path = d3.geoPath(projection);
  const selectedDataset = getSelectedDataset();

  dom.svg
    .selectAll("path.province")
    .data(mainlandAndContext, (feature) => feature.properties.id)
    .join((enter) =>
      enter
        .append("path")
        .attr("class", "province")
        .attr("tabindex", 0)
        .attr("role", "button")
        .on("pointerenter focus", handleProvinceEnter)
        .on("pointermove", handleProvinceMove)
        .on("pointerleave blur", handleProvinceLeave)
        .on("click", handleProvinceClick)
        .on("keydown", handleProvinceKeydown),
    )
    .attr("d", path)
    .attr("fill", (feature) => {
      if (selectedDataset.id === "none") {
        return "var(--province)";
      }
      const row = rowByProvince.get(getProvinceId(feature));
      const value = row?.[state.selectedDataset];
      return Number.isFinite(value) ? color(value) : "var(--missing)";
    })
    .attr("aria-label", (feature) => {
      const row = rowByProvince.get(getProvinceId(feature));
      const provinceName = getProvinceName(feature, row);
      const value = row?.[state.selectedDataset];
      return selectedDataset.id === "none"
        ? provinceName
        : `${provinceName}, ${selectedDataset.label}: ${formatValue(
            value,
            selectedDataset,
          )}`;
    })
    .classed(
      "is-selected",
      (feature) => getProvinceId(feature) === state.selectedProvinceId,
    );

  dom.svg
    .selectAll("path.province")
    .sort((a, b) => {
      const aActive =
        getProvinceId(a) === state.hoveredProvinceId ||
        getProvinceId(a) === state.selectedProvinceId;
      const bActive =
        getProvinceId(b) === state.hoveredProvinceId ||
        getProvinceId(b) === state.selectedProvinceId;
      return Number(aActive) - Number(bActive);
    });
}

function renderLegend(dataset, values, color) {
  dom.legend.innerHTML = "";
}

function renderDetail(rowByProvince) {
  const selectedFeature = state.geojson.features.find(
    (feature) => getProvinceId(feature) === state.selectedProvinceId,
  );

  if (!state.selectedProvinceId || !selectedFeature) {
    dom.provinceTitle.textContent = "Select a province";
    dom.provinceSummary.textContent =
      "Click a province to inspect selected-year data and its full ten-year table.";
    dom.metricList.innerHTML = "";
    return;
  }

  const row = rowByProvince.get(state.selectedProvinceId);
  const allProvinceRows = state.rows
    .filter((metricRow) => metricRow.province_id === state.selectedProvinceId)
    .sort((a, b) => b.year - a.year);
  const provinceName = getProvinceName(selectedFeature, row);
  const selectedDataset = getSelectedDataset();
  const selectedValue = row?.[state.selectedDataset];

  dom.provinceTitle.textContent = provinceName;
  dom.provinceSummary.textContent =
    selectedDataset.id === "none"
      ? `${state.selectedYear} selected year snapshot`
      : `${state.selectedYear} ${selectedDataset.label}: ${formatValue(
          selectedValue,
          selectedDataset,
        )}`;

  const metricDatasets = DATASETS.filter((dataset) => dataset.id !== "none");
  const snapshot = metricDatasets
    .map((dataset) => {
      const value = row?.[dataset.id];
      return `
        <div class="metric-row">
          <div class="metric-label">${dataset.label}</div>
          <div class="metric-value">${formatValue(value, dataset)}</div>
        </div>
      `;
    })
    .join("");

  const tableRows = allProvinceRows
    .map(
      (metricRow) => `
        <tr>
          <th scope="row">${metricRow.year}</th>
          <td>${formatValue(metricRow.disposable_income_per_capita, metricDatasets[0])}</td>
          <td>${formatValue(metricRow.consumption_expenditure_per_capita, metricDatasets[1])}</td>
          <td>${formatValue(metricRow.natural_growth_rate, metricDatasets[2])}</td>
        </tr>
      `,
    )
    .join("");

  dom.metricList.innerHTML = `
    <section class="selected-year-block">
      <h3>${state.selectedYear} Data</h3>
      ${snapshot}
    </section>

    <section class="history-block">
      <h3>All Years</h3>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col">Income</th>
              <th scope="col">Consumption</th>
              <th scope="col">Growth</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function handleProvinceEnter(event, feature) {
  state.hoveredProvinceId = getProvinceId(feature);
  d3.select(event.currentTarget).raise();
  showTooltip(event, feature);
}

function handleProvinceMove(event, feature) {
  showTooltip(event, feature);
}

function handleProvinceLeave() {
  state.hoveredProvinceId = null;
  hideTooltip();
}

function handleProvinceClick(event, feature) {
  state.selectedProvinceId = getProvinceId(feature);
  hideTooltip();
  render();
}

function handleProvinceKeydown(event, feature) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    state.selectedProvinceId = getProvinceId(feature);
    render();
  }
}

function showTooltip(event, feature) {
  const row = getRowsForSelectedYear().find(
    (metricRow) => metricRow.province_id === getProvinceId(feature),
  );
  const dataset = getSelectedDataset();
  const value = row?.[state.selectedDataset];
  const provinceName = getProvinceName(feature, row);

  dom.tooltip.innerHTML =
    dataset.id === "none"
      ? `
        <strong>${provinceName}</strong>
        <span>Click to view province data</span>
      `
      : `
        <strong>${provinceName}</strong>
        <span>${dataset.label}</span>
        <span>${formatValue(value, dataset)}</span>
      `;

  const padding = 18;
  const tooltipRect = dom.tooltip.getBoundingClientRect();
  const left = Math.min(
    event.clientX + padding,
    window.innerWidth - tooltipRect.width - padding,
  );
  const top = Math.min(
    event.clientY + padding,
    window.innerHeight - tooltipRect.height - padding,
  );

  dom.tooltip.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  dom.tooltip.classList.add("is-visible");
  dom.tooltip.setAttribute("aria-hidden", "false");
}

function hideTooltip() {
  dom.tooltip.classList.remove("is-visible");
  dom.tooltip.setAttribute("aria-hidden", "true");
}

function createColorScale(dataset, values) {
  if (dataset.id === "none") {
    return () => "var(--province)";
  }

  if (!values.length) {
    return () => "var(--missing)";
  }

  if (dataset.kind === "diverging") {
    const maxAbs = Math.max(Math.abs(d3.min(values)), Math.abs(d3.max(values)));
    return d3
      .scaleDiverging()
      .domain([-maxAbs, 0, maxAbs])
      .interpolator(d3.interpolateRgbBasis(["#b27070", "#565d63", "#d8f36d"]));
  }

  return d3
    .scaleSequential()
    .domain(d3.extent(values))
    .interpolator(d3.interpolateRgbBasis(["#394139", "#6f7f58", "#a9c957", "#d8f36d"]));
}

function getMainlandFeatures() {
  return state.geojson.features
    .map(cleanFeature)
    .filter((feature) => MAINLAND_PROVINCE_IDS.has(getProvinceId(feature)));
}

function cleanFeature(feature) {
  if (getProvinceId(feature) !== "hainan") {
    return feature;
  }

  return {
    ...feature,
    geometry: removeFarSouthIslands(feature.geometry),
  };
}

function removeFarSouthIslands(geometry) {
  if (geometry.type !== "MultiPolygon") {
    return geometry;
  }

  return {
    ...geometry,
    coordinates: geometry.coordinates.filter((polygon) =>
      polygon.some((ring) => ring.some((point) => point[1] >= 17)),
    ),
  };
}

function getSelectedDataset() {
  return DATASETS.find((dataset) => dataset.id === state.selectedDataset);
}

function getRowsForSelectedYear() {
  return state.rows.filter((row) => row.year === state.selectedYear);
}

function getProvinceId(feature) {
  return GEO_NAME_TO_PROVINCE_ID[feature.properties.name] ?? null;
}

function getProvinceName(feature, row) {
  if (row) {
    return `${row.province_name_en} / ${row.province_name_zh}`;
  }
  return feature.properties.name;
}

function formatValue(value, dataset) {
  if (!Number.isFinite(value)) {
    return "No data";
  }

  if (dataset.id === "natural_growth_rate") {
    return `${value.toFixed(2)} ${dataset.unit}`;
  }

  return `${Math.round(value).toLocaleString("en-US")} ${dataset.unit}`;
}
