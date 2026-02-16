const csvInput = document.getElementById('csvFile');
const dateColumnSelect = document.getElementById('dateColumn');
const targetColumnSelect = document.getElementById('targetColumn');
const periodsInput = document.getElementById('periods');
const seasonLengthInput = document.getElementById('seasonLength');
const holdoutInput = document.getElementById('holdout');
const modelSelect = document.getElementById('modelSelect');
const missingStrategySelect = document.getElementById('missingStrategy');
const runBtn = document.getElementById('runBtn');
const errorEl = document.getElementById('error');
const edaSection = document.getElementById('edaSection');
const modelSection = document.getElementById('modelSection');
const outputSection = document.getElementById('outputSection');
const kpiGrid = document.getElementById('kpiGrid');
const modelSummary = document.getElementById('modelSummary');
const modelTableBody = document.querySelector('#modelTable tbody');

let chart = null;
let rawRows = [];

const parseCSVLine = (line) => {
  const out = [];
  let value = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(value);
      value = '';
    } else {
      value += ch;
    }
  }
  out.push(value);
  return out.map((v) => v.trim());
};

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) throw new Error('CSV requires at least one data row.');
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });
    rows.push(row);
  }
  return { headers, rows };
};

const populateColumnSelectors = (headers) => {
  dateColumnSelect.innerHTML = '';
  targetColumnSelect.innerHTML = '';

  headers.forEach((h) => {
    const dateOption = new Option(h, h);
    const targetOption = new Option(h, h);
    dateColumnSelect.add(dateOption);
    targetColumnSelect.add(targetOption);
  });

  const dateGuess = headers.find((h) => /date|ds|timestamp/i.test(h)) || headers[0];
  const targetGuess = headers.find((h) => /demand|sales|qty|quantity|y|target/i.test(h)) || headers[Math.min(1, headers.length - 1)];
  dateColumnSelect.value = dateGuess;
  targetColumnSelect.value = targetGuess;
};

const aggregateAndSort = (rows, dateCol, targetCol) => {
  const map = new Map();
  rows.forEach((r) => {
    const dt = new Date(r[dateCol]);
    const y = Number(r[targetCol]);
    if (!Number.isNaN(dt.getTime()) && Number.isFinite(y)) {
      const key = dt.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + y);
    }
  });

  const points = Array.from(map.entries())
    .map(([date, value]) => ({ date: new Date(date), value }))
    .sort((a, b) => a.date - b.date);

  if (!points.length) throw new Error('No valid rows found after parsing selected columns.');
  return points;
};

const dateKey = (d) => d.toISOString().slice(0, 10);

const fillMissing = (points, strategy = 'interpolate') => {
  if (points.length < 2) return { filled: points.slice(), inferredStepDays: 1, added: 0 };

  const diffs = [];
  for (let i = 1; i < points.length; i += 1) {
    const days = Math.round((points[i].date - points[i - 1].date) / (1000 * 60 * 60 * 24));
    if (days > 0) diffs.push(days);
  }
  const inferredStepDays = diffs.length ? diffs.sort((a, b) => a - b)[Math.floor(diffs.length / 2)] : 1;

  const valueByDate = new Map(points.map((p) => [dateKey(p.date), p.value]));
  const full = [];
  const start = new Date(points[0].date);
  const end = new Date(points[points.length - 1].date);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + inferredStepDays)) {
    full.push({ date: new Date(d), value: valueByDate.get(dateKey(d)) });
  }

  let added = 0;
  for (let i = 0; i < full.length; i += 1) {
    if (full[i].value == null) {
      added += 1;
      if (strategy === 'forward') {
        full[i].value = i > 0 ? full[i - 1].value : 0;
      } else {
        let prev = i - 1;
        while (prev >= 0 && full[prev].value == null) prev -= 1;
        let next = i + 1;
        while (next < full.length && full[next].value == null) next += 1;

        if (prev >= 0 && next < full.length) {
          const ratio = (i - prev) / (next - prev);
          full[i].value = full[prev].value + ratio * (full[next].value - full[prev].value);
        } else if (prev >= 0) {
          full[i].value = full[prev].value;
        } else if (next < full.length) {
          full[i].value = full[next].value;
        } else {
          full[i].value = 0;
        }
      }
    }
  }

  return {
    filled: full.map((x) => ({ date: x.date, value: Number(x.value) })),
    inferredStepDays,
    added,
  };
};

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const std = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((acc, v) => acc + ((v - m) ** 2), 0) / (arr.length - 1));
};

const summarizeSeries = (series, missingAdded) => {
  const values = series.map((p) => p.value);
  const m = mean(values);
  const s = std(values);
  const cv = m === 0 ? 0 : s / m;
  const zOutliers = values.filter((v) => (s === 0 ? false : Math.abs((v - m) / s) >= 3)).length;

  return {
    observations: values.length,
    startDate: dateKey(series[0].date),
    endDate: dateKey(series[series.length - 1].date),
    mean: m,
    std: s,
    cv,
    min: Math.min(...values),
    max: Math.max(...values),
    outliers: zOutliers,
    missingAdded,
  };
};

const mae = (actual, pred) => mean(actual.map((y, i) => Math.abs(y - pred[i])));
const rmse = (actual, pred) => Math.sqrt(mean(actual.map((y, i) => (y - pred[i]) ** 2)));
const mape = (actual, pred) => {
  const vals = actual
    .map((y, i) => (y === 0 ? null : Math.abs((y - pred[i]) / y)))
    .filter((v) => v != null);
  return vals.length ? mean(vals) * 100 : 0;
};

const clipPositive = (arr) => arr.map((v) => Math.max(0, Number(v.toFixed(2))));

const forecastHolt = (train, horizon) => {
  if (train.length === 1) return Array(horizon).fill(train[0]);

  let best = { mae: Number.POSITIVE_INFINITY, alpha: 0.3, beta: 0.1 };
  for (let a = 0.1; a <= 0.9; a += 0.1) {
    for (let b = 0.1; b <= 0.9; b += 0.1) {
      let level = train[0];
      let trend = train[1] - train[0];
      const oneStep = [];
      for (let t = 1; t < train.length; t += 1) {
        const prevLevel = level;
        level = a * train[t] + (1 - a) * (level + trend);
        trend = b * (level - prevLevel) + (1 - b) * trend;
        oneStep.push(prevLevel + trend);
      }
      const score = mae(train.slice(1), oneStep);
      if (score < best.mae) best = { mae: score, alpha: a, beta: b };
    }
  }

  let level = train[0];
  let trend = train[1] - train[0];
  for (let t = 1; t < train.length; t += 1) {
    const prevLevel = level;
    level = best.alpha * train[t] + (1 - best.alpha) * (level + trend);
    trend = best.beta * (level - prevLevel) + (1 - best.beta) * trend;
  }

  const out = [];
  for (let h = 1; h <= horizon; h += 1) out.push(level + h * trend);
  return clipPositive(out);
};

const forecastSeasonalNaive = (train, horizon, seasonLength) => {
  const s = Math.max(1, Math.min(seasonLength, train.length));
  const out = [];
  for (let i = 0; i < horizon; i += 1) {
    out.push(train[train.length - s + (i % s)]);
  }
  return clipPositive(out);
};

const forecastTrendSeasonal = (train, horizon, seasonLength) => {
  const n = train.length;
  if (n < 3) return forecastHolt(train, horizon);

  const xMean = (n - 1) / 2;
  const yMean = mean(train);
  let num = 0;
  let den = 0;
  train.forEach((v, i) => {
    num += (i - xMean) * (v - yMean);
    den += (i - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  const s = Math.max(1, Math.min(seasonLength, n));
  const seasonal = Array(s).fill(0);
  const counts = Array(s).fill(0);
  train.forEach((v, i) => {
    const trend = intercept + slope * i;
    const idx = i % s;
    seasonal[idx] += (v - trend);
    counts[idx] += 1;
  });
  for (let i = 0; i < s; i += 1) seasonal[i] = counts[i] ? seasonal[i] / counts[i] : 0;

  const seasonalMean = mean(seasonal);
  for (let i = 0; i < s; i += 1) seasonal[i] -= seasonalMean;

  const out = [];
  for (let h = 0; h < horizon; h += 1) {
    const t = n + h;
    out.push(intercept + slope * t + seasonal[t % s]);
  }
  return clipPositive(out);
};

const runModel = (name, train, horizon, seasonLength) => {
  if (name === 'holt') return forecastHolt(train, horizon);
  if (name === 'seasonal_naive') return forecastSeasonalNaive(train, horizon, seasonLength);
  if (name === 'trend_seasonal') return forecastTrendSeasonal(train, horizon, seasonLength);
  throw new Error(`Unknown model: ${name}`);
};

const benchmarkModels = (values, holdout, seasonLength) => {
  const h = Math.min(Math.max(3, holdout), Math.floor(values.length / 2));
  const train = values.slice(0, values.length - h);
  const test = values.slice(values.length - h);

  const models = ['holt', 'seasonal_naive', 'trend_seasonal'];
  return models.map((model) => {
    const pred = runModel(model, train, h, seasonLength);
    return {
      model,
      mae: mae(test, pred),
      rmse: rmse(test, pred),
      mape: mape(test, pred),
    };
  }).sort((a, b) => a.mae - b.mae);
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const renderKpis = (stats) => {
  kpiGrid.innerHTML = '';
  const kpis = [
    ['Observations', stats.observations],
    ['Start date', stats.startDate],
    ['End date', stats.endDate],
    ['Mean demand', stats.mean.toFixed(2)],
    ['Std dev', stats.std.toFixed(2)],
    ['Coeff. variation', stats.cv.toFixed(2)],
    ['Min / Max', `${stats.min.toFixed(2)} / ${stats.max.toFixed(2)}`],
    ['Outliers (|z|>=3)', stats.outliers],
    ['Missing periods filled', stats.missingAdded],
  ];

  kpis.forEach(([name, value]) => {
    const div = document.createElement('div');
    div.className = 'kpi';
    div.innerHTML = `<div class="name">${name}</div><div class="value">${value}</div>`;
    kpiGrid.appendChild(div);
  });
};

const modelLabel = (m) => ({
  holt: 'Holt linear trend',
  seasonal_naive: 'Seasonal naive',
  trend_seasonal: 'Trend + seasonal index',
}[m] || m);

const renderModelTable = (scores, selectedModel) => {
  modelTableBody.innerHTML = '';
  scores.forEach((s) => {
    const tr = document.createElement('tr');
    const star = s.model === selectedModel ? ' ⭐' : '';
    tr.innerHTML = `
      <td>${modelLabel(s.model)}${star}</td>
      <td>${s.mae.toFixed(2)}</td>
      <td>${s.rmse.toFixed(2)}</td>
      <td>${s.mape.toFixed(2)}</td>
    `;
    modelTableBody.appendChild(tr);
  });
};

csvInput.addEventListener('change', async () => {
  errorEl.classList.add('hidden');
  try {
    const file = csvInput.files[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCSV(text);
    rawRows = parsed.rows;
    populateColumnSelectors(parsed.headers);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
});

runBtn.addEventListener('click', async () => {
  errorEl.classList.add('hidden');
  edaSection.classList.add('hidden');
  modelSection.classList.add('hidden');
  outputSection.classList.add('hidden');

  try {
    const file = csvInput.files[0];
    if (!file) throw new Error('Please upload a CSV file.');

    if (!rawRows.length) {
      const text = await file.text();
      rawRows = parseCSV(text).rows;
    }

    const dateCol = dateColumnSelect.value;
    const targetCol = targetColumnSelect.value;
    const horizon = Number(periodsInput.value);
    const seasonLength = Number(seasonLengthInput.value);
    const holdout = Number(holdoutInput.value);

    if (!Number.isInteger(horizon) || horizon < 1) throw new Error('Forecast horizon must be a positive integer.');
    if (!Number.isInteger(seasonLength) || seasonLength < 1) throw new Error('Season length must be a positive integer.');
    if (!Number.isInteger(holdout) || holdout < 3) throw new Error('Validation holdout must be at least 3.');

    const points = aggregateAndSort(rawRows, dateCol, targetCol);
    const { filled, inferredStepDays, added } = fillMissing(points, missingStrategySelect.value);
    if (filled.length < 12) throw new Error('Need at least 12 time points for reliable benchmarking.');

    const stats = summarizeSeries(filled, added);
    renderKpis(stats);

    const values = filled.map((p) => p.value);
    const scores = benchmarkModels(values, holdout, seasonLength);

    const chosen = modelSelect.value === 'auto' ? scores[0].model : modelSelect.value;
    renderModelTable(scores, chosen);
    modelSummary.textContent = `Selected model: ${modelLabel(chosen)}. Inferred interval: every ${inferredStepDays} day(s).`;

    const futureValues = runModel(chosen, values, horizon, seasonLength);
    const historyLabels = filled.map((p) => dateKey(p.date));
    const futureLabels = Array.from({ length: horizon }, (_, i) => dateKey(addDays(filled[filled.length - 1].date, inferredStepDays * (i + 1))));

    const allLabels = historyLabels.concat(futureLabels);
    const historySeries = values.concat(Array(horizon).fill(null));
    const forecastSeries = Array(values.length).fill(null).concat(futureValues);

    const ctx = document.getElementById('forecastChart');
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allLabels,
        datasets: [
          { label: 'Historical Demand', data: historySeries, borderColor: '#0b5fff', pointRadius: 1.6, tension: 0.15 },
          { label: `Forecast (${modelLabel(chosen)})`, data: forecastSeries, borderColor: '#16a34a', borderDash: [6, 6], pointRadius: 1.8, tension: 0.15 },
        ],
      },
      options: {
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } },
      },
    });

    edaSection.classList.remove('hidden');
    modelSection.classList.remove('hidden');
    outputSection.classList.remove('hidden');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
});
