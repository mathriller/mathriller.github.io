/* 공통 함수: 데이터 불러오기, 이스케이프, 앱 썸네일, 서지 표기 */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function loadJSON(name) {
  // 수정 직후에도 바로 반영되도록 캐시를 피한다
  const res = await fetch(`data/${name}.json?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${name}.json을 불러오지 못했습니다`);
  return res.json();
}

function hash(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = seed || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296;
}

/* 2022 개정 교육과정 영역 */
const AREAS = ["수와 연산", "변화와 관계", "도형과 측정", "자료와 가능성"];

/* 이미지가 없는 앱에 쓰는 기하 썸네일 (영역별 모양, 제목으로 변형) */
function thumbSVG(app) {
  const W = 320, H = 200, r = rng(hash(app.title || app.id));
  const INK = "#1d2733", RED = "#b23a26", MUTE = "#7b8591";
  let g = "";
  for (let x = 20; x < W; x += 20) g += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
  for (let y = 20; y < H; y += 20) g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
  const grid = `<g stroke="#1d2733" stroke-opacity=".07" stroke-width="1">${g}</g>`;
  let art = "";
  const area = app.area || "";

  if (area === "수와 연산") {
    // 분수 막대
    const rows = 3, top = 44;
    for (let i = 0; i < rows; i++) {
      const n = [2, 3, 4, 5, 6, 8][Math.floor(r() * 6)], y = top + i * 40, x0 = 60, w = 200, k = 1 + Math.floor(r() * (n - 1));
      for (let j = 0; j < n; j++) {
        const fill = j < k ? `fill="${RED}" fill-opacity=".14" class="accent-fill"` : `fill="#fbfaf6"`;
        art += `<rect x="${x0 + (w / n) * j}" y="${y}" width="${w / n}" height="26" ${fill} stroke="${INK}" stroke-width="1.2"/>`;
      }
      art += `<text x="${x0 + w + 14}" y="${y + 18}" font-family="Source Serif 4,serif" font-style="italic" font-size="14" fill="${MUTE}">${k}/${n}</text>`;
    }
  } else if (area === "변화와 관계") {
    // 좌표평면 위의 곡선과 점 (y = x^p 꼴 또는 파동, 상자 안에 맞춰 그림)
    const ox = 60, oy = 164, w = 220, h = 130, kind = r() < 0.6 ? "pow" : "wave", pw = 1.6 + r() * 1.2, ph = r() * 6;
    const f = (t) => (kind === "pow" ? Math.pow(t, pw) : 0.5 + 0.38 * Math.sin(ph + t * 2.4 * Math.PI) * (0.5 + t * 0.5));
    art += `<path d="M${ox} 22 V${oy} H${ox + w + 20}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
    let d = "";
    for (let i = 0; i <= 60; i++) { const t = i / 60; d += `${i ? "L" : "M"}${(ox + 6 + t * w).toFixed(1)} ${(oy - 8 - f(t) * h).toFixed(1)}`; }
    art += `<path d="${d}" fill="none" stroke="${RED}" stroke-width="1.8" class="accent"/>`;
    for (let i = 1; i <= 5; i++) { const t = i / 6; art += `<circle cx="${(ox + 6 + t * w).toFixed(1)}" cy="${(oy - 8 - f(t) * h).toFixed(1)}" r="3" fill="${INK}"/>`; art += `<line x1="${(ox + 6 + t * w).toFixed(1)}" y1="${oy}" x2="${(ox + 6 + t * w).toFixed(1)}" y2="${(oy - 8 - f(t) * h).toFixed(1)}" stroke="${INK}" stroke-opacity=".25" stroke-dasharray="2 3"/>`; }
  } else if (area === "도형과 측정") {
    // 정다각형과 내접원
    const n = 3 + Math.floor(r() * 5), cx = 150 + r() * 20, cy = 100, R = 66, rot = r() * Math.PI;
    const pts = [...Array(n)].map((_, i) => { const t = rot + (i * 2 * Math.PI) / n; return [cx + R * Math.cos(t), cy + R * Math.sin(t)]; });
    art += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${MUTE}" stroke-width="1"/>`;
    art += `<polygon points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="#fbfaf6" stroke="${INK}" stroke-width="1.4"/>`;
    art += `<circle cx="${cx}" cy="${cy}" r="${(R * Math.cos(Math.PI / n)).toFixed(1)}" fill="none" stroke="${RED}" stroke-width="1.6" class="accent"/>`;
    pts.forEach((p) => (art += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" fill="${INK}"/>`));
    art += `<line x1="${cx}" y1="${cy}" x2="${pts[0][0].toFixed(1)}" y2="${pts[0][1].toFixed(1)}" stroke="${INK}" stroke-width="1" stroke-dasharray="3 3"/>`;
  } else if (area === "자료와 가능성") {
    // 막대그래프
    const n = 5 + Math.floor(r() * 3), base = 168, bw = 22, gap = (220 - n * bw) / (n - 1), hi = Math.floor(r() * n);
    art += `<path d="M50 24 V${base} H${W - 40}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
    for (let i = 0; i < n; i++) {
      const h = 30 + r() * 110, x = 62 + i * (bw + gap);
      art += i === hi
        ? `<rect x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="${RED}" fill-opacity=".18" stroke="${RED}" stroke-width="1.4" class="accent"/>`
        : `<rect x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="#fbfaf6" stroke="${INK}" stroke-width="1.2"/>`;
    }
  } else {
    // 기하판: 격자점 위의 다각형
    for (let x = 60; x <= 260; x += 40) for (let y = 40; y <= 160; y += 40) art += `<circle cx="${x}" cy="${y}" r="2.4" fill="${MUTE}"/>`;
    const n = 4 + Math.floor(r() * 3), pts = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * 2 * Math.PI + r() * 0.6; pts.push([160 + Math.round(Math.cos(t) * (1.5 + r() * 1.2)) * 40, 100 + Math.round(Math.sin(t) * (1 + r() * 0.6)) * 40]); }
    const clamp = (p) => [Math.max(60, Math.min(260, p[0])), Math.max(40, Math.min(160, p[1]))];
    art += `<polygon points="${pts.map(clamp).map((p) => p.join(",")).join(" ")}" fill="${RED}" fill-opacity=".1" stroke="${RED}" stroke-width="1.6" stroke-linejoin="round" class="accent"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${W}" height="${H}" fill="#f6f4ee"/>${grid}${art}</svg>`;
}

function appCard(app) {
  const thumb = app.image ? `<img src="${esc(app.image)}" alt="" loading="lazy">` : thumbSVG(app);
  const meta = [app.area, app.grade].filter(Boolean).map(esc).join("<i></i>");
  const tags = (app.tags || []).slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  const sample = app.sample ? `<span class="tag sample">예시</span>` : "";
  const href = app.url || "#";
  return `<a class="app" href="${esc(href)}" target="_blank" rel="noopener">
    <div class="thumb">${thumb}</div>
    <div class="body">
      <div class="meta">${meta}</div>
      <h3>${esc(app.title)}</h3>
      <p>${esc(app.summary || "")}</p>
      <div class="foot"><div class="tags">${sample}${tags}</div><span class="go">열기 ↗</span></div>
    </div>
  </a>`;
}

/* 서지 정보 */
const TYPE_LABEL = { journal: "국내 학술지", intl: "국외 학술지", conference: "학술발표", book: "저서", report: "연구보고서", etc: "기타" };

function authorsHTML(item, me) {
  return (item.authors || []).map((a) => {
    const isMe = me && (a.name === me.name || (a.orcid && a.orcid === me.orcid));
    const role = a.role === "corresponding" ? "<sup>*</sup>" : "";
    return `<span class="${isMe ? "me" : ""}">${esc(a.name)}</span>${role}`;
  }).join(", ");
}

function venueText(it) {
  let v = it.journal || it.publisher || "";
  const vol = it.volume ? `${it.volume}${it.issue ? `(${it.issue})` : ""}` : (it.issue ? `(${it.issue})` : "");
  return [v && `<em>${esc(v)}</em>`, esc(vol), it.pages && esc(it.pages)].filter(Boolean).join(", ");
}

async function renderFooter() {
  const foot = $("#site-foot");
  if (!foot) return;
  try {
    const p = await loadJSON("profile");
    const addr = [p.university, p.department].filter(Boolean).join(" ");
    foot.innerHTML = `<div class="wrap">
      <div>${esc(addr)}${p.office ? ` · ${esc(p.office)}` : ""}${p.email ? ` · <a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ""}</div>
      <div>© ${new Date().getFullYear()} ${esc(p.name)} · <a href="admin.html">관리</a></div>
    </div>`;
  } catch { /* 바닥글은 없어도 된다 */ }
}
document.addEventListener("DOMContentLoaded", renderFooter);
