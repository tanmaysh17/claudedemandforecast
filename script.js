const csvInput = document.getElementById('csvFile');
const periodsInput = document.getElementById('periods');
const button = document.getElementById('generateBtn');
const errorEl = document.getElementById('error');
const outputSection = document.getElementById('outputSection');
let chart = null;

const parseCSV = (text) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV requires at least one data row.');

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const dateIdx = headers.indexOf('date');
  const demandIdx = headers.indexOf('demand');
  if (dateIdx === -1 || demandIdx === -1) throw new Error('CSV must include date and demand columns.');

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',');
    const date = new Date(cols[dateIdx]);
    const demand = Number(cols[demandIdx]);
    if (!Number.isNaN(date.getTime()) && Number.isFinite(demand)) {
      rows.push({ date, demand });
    }
  }
  if (!rows.length) throw new Error('No valid rows found after parsing CSV.');
  rows.sort((a, b) => a.date - b.date);
  return rows;
};

const linearForecast = (values, periods) => {
  if (values.length === 1) return Array(periods).fill(Math.max(0, values[0]).toFixed(2));

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    num += (i - xMean) * (v - yMean);
    den += (i - xMean) ** 2;
  });

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  return Array.from({ length: periods }, (_, idx) => {
    const yhat = slope * (n + idx) + intercept;
    return Math.max(0, yhat).toFixed(2);
  });
};

button.addEventListener('click', async () => {
  errorEl.classList.add('hidden');
  outputSection.classList.add('hidden');

  try {
    const file = csvInput.files[0];
    if (!file) throw new Error('Please upload a CSV file.');
    const periods = Number(periodsInput.value);
    if (!Number.isInteger(periods) || periods < 1) throw new Error('Forecast horizon must be a positive integer.');

    const text = await file.text();
    const rows = parseCSV(text);
    const historyLabels = rows.map((r) => r.date.toISOString().slice(0, 10));
    const historyValues = rows.map((r) => r.demand);
    const forecastValues = linearForecast(historyValues, periods).map(Number);

    const lastDate = rows[rows.length - 1].date;
    const forecastLabels = Array.from({ length: periods }, (_, i) => {
      const d = new Date(lastDate);
      d.setDate(lastDate.getDate() + i + 1);
      return d.toISOString().slice(0, 10);
    });

    const allLabels = historyLabels.concat(forecastLabels);
    const historySeries = historyValues.concat(Array(periods).fill(null));
    const forecastSeries = Array(historyValues.length).fill(null).concat(forecastValues);

    const ctx = document.getElementById('forecastChart');
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allLabels,
        datasets: [
          { label: 'Historical Demand', data: historySeries, borderColor: '#0b5fff', tension: 0.2 },
          { label: 'Forecasted Demand', data: forecastSeries, borderColor: '#2a9d8f', borderDash: [6, 6], tension: 0.2 },
        ],
      },
    });

    outputSection.classList.remove('hidden');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
});
