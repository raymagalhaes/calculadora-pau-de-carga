'use strict';

const defaults = Object.freeze({ L: 9, We: 120, Wc: 20, P: 200, d: 3, theta: 30, cable: 90 });
const radians = degrees => degrees * Math.PI / 180;
const degrees = angle => angle * 180 / Math.PI;
const clamp = value => Math.max(-1, Math.min(1, value));
const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const format = value => Math.abs(value) >= 1e12 ? value.toExponential(2).replace('.', ',') : numberFormat.format(value);
const $ = id => document.getElementById(id);
const keys = Object.keys(defaults);
const storageKey = 'pau-de-carga-v2';
const phoneAxis = [0, 1, 0];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem('pau de carga-de-carga-v2')) || {}; } catch { /* Sessão sem armazenamento. */ }
let values = { ...defaults, ...saved.values };
let lastValues = { ...values };
let axis = Array.isArray(saved.axis) && saved.axis.length === 3 && saved.axis.every(Number.isFinite)
  && Math.abs(Math.hypot(...saved.axis) - 1) < 1e-6 ? saved.axis : null;
let theme = ['light', 'dark'].includes(saved.theme) ? saved.theme : '';
let positionLimit = 100;

function persist() {
  for (const key of keys) if (values[key] !== null) lastValues[key] = values[key];
  try { localStorage.setItem(storageKey, JSON.stringify({ values: lastValues, axis, theme })); } catch { /* Os controles continuam disponíveis. */ }
}

// Ângulo do cabo como offset da vertical: 0° para cima, 90° horizontal.
// Hipótese explícita: a tração aponta contra a inclinação do pau de carga.
function direction(cable) {
  return Number.isFinite(cable) && cable >= 0 && cable <= 90 ? -cable : null;
}

function solve({ L, We, Wc, P, d, theta, cable }) {
  const result = {};
  const validTheta = Number.isFinite(theta) && theta >= 0 && theta <= 90;
  const validMasses = [We, Wc, P].every(value => Number.isFinite(value) && value >= 0);
  const validLength = Number.isFinite(L) && L > 0;
  const availableHeight = validLength && validTheta ? L * Math.cos(radians(theta)) : NaN;
  const validPoint = Number.isFinite(d) && d > 0 && Number.isFinite(availableHeight) && d <= availableHeight + 1e-9;
  const attachmentDistance = validPoint ? d / Math.cos(radians(theta)) : NaN;
  const phi = direction(cable)
  if (validMasses && Number.isFinite(We + Wc + P)) result.total = We + Wc + P;
  if (validPoint) result.height = d;
  if (validTheta && phi !== null) result.relative = degrees(Math.acos(clamp(Math.cos(radians(phi - theta)))));
  if (validLength && validMasses && validTheta) {
    const moment = theta === 0 ? 0 : (P + Wc + We / 2) * (L * Math.sin(radians(theta)));
    if (Number.isFinite(moment)) result.moment = moment;
  }
  if (!validLength) result.error = 'Informe um comprimento maior que zero.';
  else if (!validMasses) result.error = 'Informe massas iguais ou maiores que zero.';
  else if (!validPoint) result.error = 'A altura da fixação deve ser maior que zero e não ultrapassar a altura do pau de carga nessa inclinação.';
  else if (!validTheta || !Number.isFinite(cable) || cable < 0 || cable > 90) result.error = 'Informe inclinações entre 0° e 90°.';
  else if (phi === null) result.error = 'Informe o desvio do cabo entre 0° e 90° a partir da vertical.';
  else if (!Number.isFinite(result.moment) || !Number.isFinite(result.total)) result.error = 'Os valores excedem a faixa de cálculo.';
  else {
    // O peso faz o pau de carga inclinar para a direita. A tração deve gerar momento negativo.
    const signedLever = Math.sin(radians(phi - theta));
    if (Math.abs(signedLever) < 1e-9) result.error = 'O cabo está alinhado ou quase alinhado ao pau de carga e não fornece momento útil.';
    else if (result.moment > 0 && signedLever > 0) result.error = 'A tração nessa direção aumenta o momento gravitacional em vez de equilibrá-lo.';
    else {
      const tension = (result.moment / attachmentDistance) / Math.abs(signedLever);
      if (Number.isFinite(tension)) result.tension = tension;
      else result.error = 'A tensão excede a faixa de cálculo.';
    }
  }
  return result;
}

function writeValues() {
  for (const key of keys) $(key).value = values[key] ?? '';
}
function readValues() {
  for (const key of keys) {
    const field = $(key);
    values[key] = field.type === 'number' ? (field.validity.valid ? field.valueAsNumber : null) : field.value;
  }
}
function display(id, value, unit) {
  $(id).textContent = Number.isFinite(value) ? `${format(value)} ${unit}` : '—';
}
function resultCell(result) {
  return result.error ? `<span title="${result.error}">—<span class="sr-only"> ${result.error}</span></span>` : format(result.tension);
}
function render() {
  const result = solve(values);
  display('kgf', result.tension, 'kgf');
  display('kn', result.tension * 0.00980665, 'kN');
  display('moment', result.moment, 'kgf·m');
  display('height', result.height, 'm');
  display('relative', result.relative, '°');
  display('total', result.total, 'kg');
  $('validation').textContent = result.error ?? '';
  const validLength = Number.isFinite(values.L) && values.L > 0;
  $('fix-slider').disabled = !validLength;
  $('theta-slider').value = Number.isFinite(values.theta) ? values.theta : 0;
  $('cable-slider').value = Number.isFinite(values.cable) ? values.cable : 0;
  $('cable-value').textContent = Number.isFinite(values.cable) ? `${format(values.cable)}°` : '—';
  $('theta-value').textContent = Number.isFinite(values.theta) ? `${format(values.theta)}°` : '—';
  $('P-value').textContent = Number.isFinite(values.P) ? `${format(values.P)} kg` : '—';
  $('d-value').textContent = Number.isFinite(values.d) ? `${format(values.d)} m` : '—';
  $('load-slider').max = Math.max(1000, Number.isFinite(values.P) ? Math.ceil(values.P / 100) * 100 : 1000);
  $('load-slider').value = Number.isFinite(values.P) ? values.P : 0;
  $('fix-slider').max = validLength && Number.isFinite(values.theta) ? Math.max(0, values.L * Math.cos(radians(values.theta))) : 1;
  $('fix-slider').value = values.d ?? 0;
  $('angle-rows').innerHTML = Array.from({ length: 10 }, (_, index) => {
    const theta = index * 10;
    return `<tr><th scope="row">${theta}°</th><td>${resultCell(solve({ ...values, theta }))}</td></tr>`;
  }).join('');
  const count = validLength && Number.isFinite(values.theta) ? Math.floor(Math.max(0, values.L * Math.cos(radians(values.theta))) + 1e-9) : 0;
  $('point-rows').innerHTML = Array.from({ length: Math.min(count, positionLimit) }, (_, index) => {
    const d = index + 1;
    return `<tr><th scope="row">${d}</th><td>${resultCell(solve({ ...values, d }))}</td></tr>`;
  }).join('') || '<tr><td colspan="2">Sem posições inteiras neste comprimento.</td></tr>';
  $('more').hidden = count <= positionLimit;
  updateDiagram();
}

const svg = $('geometry');
const line = (a, b, stroke, width, extra = '') => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
const circle = (p, radius, color) => `<circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="${color}"/>`;
const label = (p, text, anchor = 'middle') => `<text x="${p.x}" y="${p.y}" text-anchor="${anchor}">${text}</text>`;
const shift = (p, x, y) => ({ x: p.x + x, y: p.y + y });
const project = (p, length, angle) => shift(p, length * Math.sin(radians(angle)), -length * Math.cos(radians(angle)));
function arc(p, radius, angle, color, endRadius = radius + 17) {
  if (Math.abs(angle) < 0.05) return '';
  const end = project(p, radius, angle);
  return `<path d="M ${p.x} ${p.y - radius} A ${radius} ${radius} 0 0 ${angle > 0 ? 1 : 0} ${end.x} ${end.y}" fill="none" stroke="${color}" stroke-width="1.5"/>`
    + label(project(p, endRadius, angle / 2), `${format(Math.abs(angle))}°`);
}
function draw({ theta, phi, fraction, complete }) {
  const zero = { x: 0, y: 0 };
  const unitTip = project(zero, 1, theta);
  const unitPoint = project(zero, fraction ?? 0, theta);
  const unitCable = phi === null ? unitPoint : project(unitPoint, .57, phi);
  const xs = [0, unitTip.x, unitCable.x];
  const ys = [-.15, 0, unitTip.y, unitCable.y];
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min(235, 325 / Math.max(.1, maxX - minX), 233 / Math.max(.1, maxY - minY));
  const base = { x: 230 - (minX + maxX) * scale / 2, y: 300 - maxY * scale };
  const tip = project(base, scale, theta);
  const middle = project(base, scale / 2, theta);
  const point = project(base, scale * (fraction ?? 0), theta);
  const cableEnd = phi === null ? point : project(point, scale * .57, phi);
  const ropeEnd = shift(tip, 0, 41);
  const reference = 'stroke-dasharray="4 5"';
  const gravity = 'marker-end="url(#weight-arrow)"';
  const poleColor = 'var(--pole)', cableColor = 'var(--cable)', weightColor = 'var(--weight)';
  svg.innerHTML = line(base, shift(base, 0, Math.min(tip.y - base.y - 18, -69)), 'var(--muted)', 1, reference)
    + `<path d="M${base.x} ${base.y} l-15 19 h30 Z" fill="var(--line)" stroke="var(--ink)"/>`
    + line(shift(base, -24, 19), shift(base, 24, 19), 'var(--ink)', 2)
    + line(base, tip, poleColor, 8) + circle(base, 5, 'var(--ink)') + circle(tip, 7, poleColor)
    + arc(base, 39, theta, poleColor)
    + line(tip, ropeEnd, 'var(--ink)', 1.5)
    + `<rect x="${ropeEnd.x - 12}" y="${ropeEnd.y - 10}" width="24" height="18" rx="3" fill="${weightColor}"/>`
    + line(middle, shift(middle, 0, 33), weightColor, 2, gravity)
    + line(shift(tip, 7, 1), shift(tip, 7, 26), weightColor, 2, gravity)
    + line(shift(ropeEnd, 0, 8), shift(ropeEnd, 0, 30), weightColor, 2, gravity)
    + label(shift(middle, 6, 33), 'Estrutura', 'start')
    + label(shift(tip, 12, -10), 'Cabeça', 'start')
    + label(shift(ropeEnd, -16, 1), 'Carga', 'end')
    + label(shift(project(base, scale * .78, theta), 13, -13), `${format(values.L)} m`, 'start')
    + (fraction === null ? '' : circle(point, 5, cableColor) + label(shift(point, -8, -7), `${format(values.d)} m altura`, 'end'))
    + (phi === null || fraction === null ? '' : line(point, shift(point, 0, -48), 'var(--muted)', 1, reference)
      + line(point, cableEnd, cableColor, 2.5, complete ? 'marker-end="url(#cable-arrow)"' : reference)
      + arc(point, Math.min(28, scale * .25), phi, cableColor, Math.min(45, scale * .25 + 15)));
}
let currentDiagram;
let frame;
function updateDiagram() {
  cancelAnimationFrame(frame);
  const { L, d, theta, cable } = values;
  $('visual-angles').textContent = `Da vertical · pau de carga ${theta === null ? '—' : `${format(theta)}°`} · cabo ${cable === null ? '—' : `${format(cable)}°`}`;
  if (!Number.isFinite(L) || L <= 0 || !Number.isFinite(theta)) {
    svg.replaceChildren();
    currentDiagram = null;
    $('diagram-note').textContent = 'Informe um comprimento positivo e uma inclinação válida para desenhar o pau de carga.';
    return;
  }
  const phi = direction(cable);
  const availableHeight = L * Math.cos(radians(theta));
  const fraction = Number.isFinite(d) && d > 0 && availableHeight > 1e-9 && d <= availableHeight + 1e-9 ? d / availableHeight : null;
  const target = { theta, phi, fraction, complete: phi !== null };
  $('diagram-note').textContent = fraction === null ? 'Informe uma altura de fixação válida para visualizar o cabo.'
    : phi === null ? 'Informe um ângulo válido do cabo para visualizar a tração.'
      : `Desvio do cabo: ${format(Math.abs(phi))}° da vertical, com tração assumida em sentido oposto ao pau de carga. Comprimento esquemático.`;
  const start = currentDiagram;
  if (!start || reducedMotion.matches || start.complete !== target.complete || start.fraction === null || fraction === null
    || start.phi === null || target.phi === null) {
    draw(currentDiagram = target);
    return;
  }
  const startTime = performance.now();
  const delta = (target.phi - start.phi + 540) % 360 - 180;
  function animate(now) {
    const progress = Math.min(1, (now - startTime) / 240);
    const ease = 1 - (1 - progress) ** 3;
    currentDiagram = progress === 1 ? target : {
      theta: start.theta + (target.theta - start.theta) * ease,
      phi: ((start.phi + delta * ease + 540) % 360) - 180,
      fraction: start.fraction + (fraction - start.fraction) * ease,
      complete: target.complete
    };
    draw(currentDiagram);
    if (progress < 1) frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
}

const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const sensor = $('sensor');
const sensorReadout = $('sensor-readout');
let lastSensorDisplay = 0;
function showSensorSample(vector, key, now) {
  if (now - lastSensorDisplay < 100) return;
  lastSensorDisplay = now;
  const magnitude = Math.hypot(...vector);
  const unit = vector.map(value => value / magnitude);
  const reference = key === 'calibrate' ? phoneAxis : (axis ?? phoneAxis);
  const angle = degrees(Math.acos(clamp(Math.abs(dot(unit, reference)))));
  $('sensor-angle').textContent = `${angle.toFixed(1).replace('.', ',')}°`;
  $('sensor-axes').textContent = ['X', 'Y', 'Z'].map((name, index) => `${name}: ${vector[index].toFixed(2).replace('.', ',')}`).join(' · ') + ' m/s²';
}
let measuring = false;
const pending = { theta: null, cable: null };
function clearPending(key) {
  pending[key] = null;
  $(`preview-${key}`).textContent = '';
  $(`save-${key}`).disabled = true;
}
// Usa a média curta das amostras disponíveis; não exige estabilização.
const measurementWindowMs = 1200;
function collectMotion(onProgress, onSample) {
  return new Promise((resolve, reject) => {
    const readings = [];
    let finished = false;
    let timeout;
    function finish(error, value) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      window.removeEventListener('devicemotion', add);
      if (error) reject(error);
      else resolve(value);
    }
    function add(event) {
      const sample = event.accelerationIncludingGravity;
      if (!sample || ![sample.x, sample.y, sample.z].every(Number.isFinite)) return;
      const vector = [sample.x, sample.y, sample.z];
      const magnitude = Math.hypot(...vector);
      if (magnitude < 1e-6) return;
      const now = performance.now();
      onSample(vector, now);
      readings.push(vector.map(value => value / magnitude));
      onProgress('Lendo acelerômetro…');
    }
    window.addEventListener('devicemotion', add);
    timeout = window.setTimeout(() => {
      if (!readings.length) {
        finish(new Error('Nenhuma leitura recebida do acelerômetro. Verifique as permissões do navegador.'));
        return;
      }
      const average = [0, 1, 2].map(i => readings.reduce((sum, vector) => sum + vector[i], 0) / readings.length);
      const norm = Math.hypot(...average);
      finish(null, norm > 1e-6 ? average.map(value => value / norm) : readings[readings.length - 1]);
    }, measurementWindowMs);
  });
}
function calibrationStatus() {
  $('calibration').textContent = axis ? 'Calibração registrada' : 'Eixo longitudinal padrão';
}
async function measure(key) {
  if (measuring) return;
  if (key !== 'calibrate') clearPending(key);
  sensorReadout.hidden = false;
  sensorReadout.classList.add('sensor-active');
  $('sensor-angle').textContent = '—';
  $('sensor-axes').textContent = 'X: — · Y: — · Z: —';
  $('sensor-phase').textContent = 'Aguardando leituras…';
  lastSensorDisplay = 0;
  if (!window.isSecureContext || !window.DeviceMotionEvent) {
    sensor.textContent = 'Sensor indisponível. Abra pelo HTTPS ou use a entrada manual.';
    $('sensor-phase').textContent = sensor.textContent;
    sensorReadout.classList.remove('sensor-active');
    return;
  }
  measuring = true;
  const buttons = ['calibrate', 'measure-theta', 'measure-cable', 'reset'].map($);
  buttons.forEach(button => { button.disabled = true; });
  try {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      let permission;
      try { permission = await DeviceMotionEvent.requestPermission(); } catch { permission = 'denied'; }
      if (permission !== 'granted') throw new Error('Permissão do acelerômetro indisponível. Verifique as permissões do navegador ou use a entrada manual.');
    }
    sensor.textContent = 'Lendo acelerômetro…';
    const unit = await collectMotion(message => { sensor.textContent = message; $('sensor-phase').textContent = message; }, (vector, now) => showSensorSample(vector, key, now));
    if (key === 'calibrate') {
      if (Math.abs(dot(unit, phoneAxis)) < Math.cos(radians(15))) throw new Error('Posicione o celular na vertical, com o topo para cima, e repita a calibração.');
      axis = unit;
      clearPending('theta');
      clearPending('cable');
      persist();
      calibrationStatus();
      sensor.textContent = 'Calibração concluída.';
      $('sensor-phase').textContent = 'Calibração concluída.';
    } else {
      const angle = degrees(Math.acos(clamp(Math.abs(dot(unit, axis ?? phoneAxis)))));
      pending[key] = Math.round(angle * 10) / 10;
      $(`preview-${key}`).textContent = `Leitura: ${format(pending[key])}°. Registre para aplicar.`;
      $(`save-${key}`).disabled = false;
      $(`measure-${key}`).textContent = key === 'theta' ? 'Repetir medição do pau de carga' : 'Repetir medição do cabo';
      sensor.textContent = 'Leitura capturada. Confirme em Registrar para aplicar o ângulo.';
      $('sensor-angle').textContent = `${format(pending[key])}°`;
      $('sensor-phase').textContent = 'Leitura capturada. Toque em Registrar.';
    }
  } catch (error) {
    sensor.textContent = error.message;
    $('sensor-phase').textContent = error.message;
  } finally {
    measuring = false;
    buttons.forEach(button => { button.disabled = false; });
    sensorReadout.classList.remove('sensor-active');
  }
}

function updateInputs() {
  const oldLength = values.L;
  readValues();
  if (values.L !== oldLength) positionLimit = 100;
  persist();
  render();
}
for (const key of keys) {
  $(key).addEventListener('input', () => {
    if (key === 'theta' || key === 'cable') clearPending(key);
    updateInputs();
  });
}
for (const key of ['theta', 'cable']) {
  $(`measure-${key}`).addEventListener('click', () => measure(key));
  $(`save-${key}`).addEventListener('click', () => {
    if (pending[key] === null) return;
    $(key).value = pending[key];
    updateInputs();
    clearPending(key);
    $(`preview-${key}`).textContent = 'Medição registrada.';
  });
}
$('calibrate').addEventListener('click', () => measure('calibrate'));
for (const [slider, field] of [['theta-slider', 'theta'], ['cable-slider', 'cable'], ['load-slider', 'P']]) {
  $(slider).addEventListener('input', event => {
    $(field).value = event.target.value;
    if (field === 'theta' || field === 'cable') clearPending(field);
    updateInputs();
  });
}
$('fix-slider').addEventListener('input', event => {
  $('d').value = event.target.value;
  updateInputs();
});
$('more').addEventListener('click', () => { positionLimit += 100; render(); });
$('reset').addEventListener('click', () => {
  values = { ...defaults };
  positionLimit = 100;
  clearPending('theta');
  clearPending('cable');
  $('measure-theta').textContent = 'Medir pau de carga';
  $('measure-cable').textContent = 'Medir cabo';
  writeValues();
  persist();
  render();
});
const darkPreference = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const active = theme || (darkPreference.matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = active;
  $('theme').textContent = active === 'dark' ? 'Tema claro' : 'Tema escuro';
}
$('theme').addEventListener('click', () => {
  theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  persist();
});
darkPreference.addEventListener('change', applyTheme);
applyTheme();
writeValues();
calibrationStatus();
render();

let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  $('install').hidden = false;
});
$('install').addEventListener('click', async () => {
  const prompt = installPrompt;
  installPrompt = null;
  $('install').hidden = true;
  if (prompt) {
    try { await prompt.prompt(); } catch { $('offline').textContent = 'Use o menu do Chrome para instalar o aplicativo.'; }
  }
});
window.addEventListener('appinstalled', () => { $('install').hidden = true; });
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    $('offline').textContent = 'Aplicativo disponível offline neste dispositivo.';
  }).catch(() => { $('offline').textContent = 'Não foi possível preparar o acesso offline.'; });
}
