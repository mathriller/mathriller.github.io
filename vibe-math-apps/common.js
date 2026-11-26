// tab switching between the "AI default" (bad) and "refined" (good) versions
(function () {
  const tabs = document.querySelectorAll('.tab');
  function show(v) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.v === v));
    document.querySelectorAll('.view').forEach(s => (s.hidden = s.id !== v));
    try { history.replaceState(null, '', '?v=' + v); } catch (e) {}
    window.dispatchEvent(new CustomEvent('viewchange', { detail: v }));
  }
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.v)));
  const v = new URLSearchParams(location.search).get('v');
  show(v === 'good' ? 'good' : 'bad');
})();

const SVGNS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

// small +/- control. returns {v, set(x), setMax(m)}
function stepper(id, v, min, max, cb) {
  const host = document.getElementById(id);
  host.className = 'stepper';
  host.innerHTML = '<button type="button" aria-label="빼기">−</button><span></span><button type="button" aria-label="더하기">+</button>';
  const s = host.querySelector('span');
  const o = {
    get v() { return v; },
    set(x, silent) { v = Math.max(min, Math.min(max, x)); s.textContent = v; if (!silent && cb) cb(v); },
    setMax(m) { max = m; if (v > max) o.set(max, true); },
  };
  host.children[0].onclick = () => o.set(v - 1);
  host.children[2].onclick = () => o.set(v + 1);
  s.textContent = v;
  return o;
}
