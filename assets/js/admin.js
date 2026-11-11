/* 홈페이지 관리: GitHub REST API로 data/*.json 을 직접 수정한다.
   KCI 가져오기는 브라우저에서 KCI에 직접 접속할 수 없으므로(CORS)
   GitHub Actions 워크플로(.github/workflows/kci.yml)를 실행시켜 처리한다. */

const KEY = "hp-admin";
const cfg = Object.assign({ repo: "", branch: "main", token: "" }, JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "{}"));
const S = { apps: null, research: null, profile: null };

/* ---------- 유틸 ---------- */
function toast(msg, err = false) {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast on" + (err ? " err" : "");
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = "toast"), err ? 6000 : 3200);
}
const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str); let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const b64decode = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
const slug = (s) => (String(s).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item") + "-" + Date.now().toString(36);
const lines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
const csv = (s) => String(s || "").split(/[,，]/).map((x) => x.trim()).filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- GitHub API ---------- */
async function gh(path, opt = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: opt.method || "GET",
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(opt.body ? { "Content-Type": "application/json" } : {}) },
    body: opt.body ? JSON.stringify(opt.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.message || `GitHub 오류 (${res.status})`); e.status = res.status; throw e;
  }
  return data;
}
const repoPath = () => `/repos/${cfg.repo}`;

async function readFile(path) {
  const d = await gh(`${repoPath()}/contents/${path}?ref=${encodeURIComponent(cfg.branch)}`);
  let content = d.content;
  if (!content && d.sha) content = (await gh(`${repoPath()}/git/blobs/${d.sha}`)).content; // 1MB 넘는 파일
  return { text: b64decode(content), sha: d.sha };
}
async function readJSON(name) {
  const { text, sha } = await readFile(`data/${name}.json`);
  return { data: JSON.parse(text), sha };
}
async function putFile(path, base64, message, sha) {
  return gh(`${repoPath()}/contents/${path}`, { method: "PUT", body: { message, content: base64, branch: cfg.branch, ...(sha ? { sha } : {}) } });
}
/* 최신 파일을 읽고 → 수정 → 저장. 그사이 다른 변경이 있으면 한 번 더 시도 */
async function mutate(name, fn, message) {
  for (let i = 0; i < 3; i++) {
    const cur = await readJSON(name);
    const next = fn(structuredClone(cur.data));
    try {
      const r = await putFile(`data/${name}.json`, b64encode(JSON.stringify(next, null, 2) + "\n"), message, cur.sha);
      S[name] = { data: next, sha: r.content.sha };
      return next;
    } catch (e) {
      if (e.status === 409 || e.status === 422) { await sleep(800); continue; }
      throw e;
    }
  }
  throw new Error("다른 변경과 겹쳐 저장하지 못했습니다. 새로고침 후 다시 시도해 주세요.");
}

/* 이미지 업로드: 긴 변 1400px 이하 JPEG 로 줄여서 올린다 */
async function uploadImage(file, base) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.86));
  const buf = new Uint8Array(await blob.arrayBuffer()); let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const path = `assets/img/${base}-${Date.now().toString(36)}.jpg`;
  await putFile(path, btoa(bin), `이미지 추가: ${path}`);
  return path;
}

/* ---------- 연결 ---------- */
function guessRepo() {
  const h = location.hostname, m = h.match(/^([^.]+)\.github\.io$/);
  if (!m) return "";
  const first = location.pathname.split("/").filter(Boolean)[0];
  return first && !first.endsWith(".html") ? `${m[1]}/${first}` : `${m[1]}/${h}`;
}

async function connect() {
  const repo = await gh(repoPath());
  if (!repo.permissions?.push) throw new Error("이 토큰으로는 저장소에 쓸 수 없습니다. Contents 권한을 Read and write로 설정했는지 확인해 주세요.");
  const [apps, research, profile] = await Promise.all([readJSON("apps"), readJSON("research"), readJSON("profile")]);
  Object.assign(S, { apps, research, profile });
}

function showLogin(msg) {
  $("#login").hidden = false; $("#panel").hidden = true;
  $("#l-repo").value = cfg.repo || guessRepo();
  $("#l-branch").value = cfg.branch || "main";
  if (msg) toast(msg, true);
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const c = { repo: $("#l-repo").value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, ""), branch: $("#l-branch").value.trim() || "main", token: $("#l-token").value.trim() };
  setCfg(c, $("#l-remember").checked);
  const btn = e.submitter; btn.disabled = true; btn.textContent = "확인 중…";
  try { await connect(); startPanel(); }
  catch (err) { showLogin(err.status === 401 ? "토큰이 올바르지 않습니다." : err.status === 404 ? "저장소를 찾을 수 없습니다. 이름과 토큰의 저장소 선택을 확인해 주세요." : err.message); }
  finally { btn.disabled = false; btn.textContent = "연결"; }
});

function setCfg(c, remember) {
  localStorage.removeItem(KEY); sessionStorage.removeItem(KEY);
  Object.assign(cfg, c);
  (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(cfg));
}

$("#logout").addEventListener("click", () => {
  if (!confirm("이 기기에서 토큰을 지우고 연결을 해제할까요?")) return;
  localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); location.reload();
});

/* ---------- 탭 ---------- */
$$(".tabs button").forEach((b) => b.addEventListener("click", () => {
  $$(".tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
  $$("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
  history.replaceState(null, "", `#${b.dataset.tab}`);
}));
$$("dialog [data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

function startPanel() {
  $("#login").hidden = true; $("#panel").hidden = false;
  $("#repo-label").textContent = `${cfg.repo} · ${cfg.branch}`;
  renderApps(); renderResearch(); fillProfile();
  const tab = location.hash.slice(1);
  if (tab) $(`.tabs button[data-tab="${tab}"]`)?.click();
}

/* ================= 앱 ================= */
function renderApps() {
  const items = S.apps.data.items;
  $("#apps-note").textContent = `${items.length}개 · 위아래 화살표로 순서를 바꿀 수 있습니다.`;
  $("#apps-clear-sample").hidden = !items.some((a) => a.sample);
  $("#apps-rows").innerHTML = items.map((a, i) => `<div class="rowi ${a.hidden ? "is-hidden" : ""}" data-i="${i}">
      <div class="mini">${a.image ? `<img src="${esc(a.image)}" alt="">` : thumbSVG(a)}</div>
      <div><div class="t">${esc(a.title)}${a.sample ? '<span class="badge red">예시</span>' : ""}${a.featured ? '<span class="badge green">첫 화면</span>' : ""}${a.hidden ? '<span class="badge">숨김</span>' : ""}</div>
        <div class="s">${esc([a.area, a.grade].filter(Boolean).join(" · "))} · <a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url)}</a></div></div>
      <div class="ops">
        <button class="btn ghost small" data-op="up" ${i === 0 ? "disabled" : ""} aria-label="위로">↑</button>
        <button class="btn ghost small" data-op="down" ${i === items.length - 1 ? "disabled" : ""} aria-label="아래로">↓</button>
        <button class="btn ghost small" data-op="edit">수정</button>
        <button class="btn danger small" data-op="del">삭제</button>
      </div></div>`).join("") || `<div class="empty" style="margin-top:16px">아직 앱이 없습니다. 오른쪽 위 ‘새 앱 추가’를 눌러 주세요.</div>`;
}

let editingApp = null;
function openApp(app) {
  editingApp = app || null;
  const f = $("#app-form"); f.reset();
  $("#app-dlg-title").textContent = app ? "앱 수정" : "앱 추가";
  if (app) {
    ["title", "url", "summary", "area", "grade", "image"].forEach((k) => (f.elements[k].value = app[k] || ""));
    f.elements.tags.value = (app.tags || []).join(", ");
    f.elements.featured.checked = !!app.featured; f.elements.hidden.checked = !!app.hidden;
  }
  $("#img-now").textContent = app?.image ? `현재: ${app.image}` : "이미지가 없으면 영역에 맞는 그림이 자동으로 들어갑니다.";
  $("#app-dlg").showModal();
}
$("#apps-new").addEventListener("click", () => openApp(null));

$("#app-save").addEventListener("click", async () => {
  const f = $("#app-form");
  if (!f.reportValidity()) return;
  const btn = $("#app-save"); btn.disabled = true; btn.textContent = "저장 중…";
  try {
    const v = (k) => f.elements[k].value.trim();
    const id = editingApp?.id || slug(v("title"));
    let image = v("image");
    if (f.elements.image_file.files[0]) image = await uploadImage(f.elements.image_file.files[0], "apps/app");
    const app = { id, title: v("title"), summary: v("summary"), url: v("url"), image, area: v("area"), grade: v("grade"), tags: csv(v("tags")) };
    if (f.elements.featured.checked) app.featured = true;
    if (f.elements.hidden.checked) app.hidden = true;
    await mutate("apps", (d) => {
      const i = d.items.findIndex((x) => x.id === id);
      if (i >= 0) d.items[i] = app; else d.items.unshift(app);
      return d;
    }, `${editingApp ? "앱 수정" : "앱 추가"}: ${app.title}`);
    $("#app-dlg").close(); renderApps(); toast("저장했습니다. 1~2분 뒤 사이트에 반영됩니다.");
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; btn.textContent = "저장"; }
});

$("#apps-rows").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-op]"); if (!b) return;
  const i = +b.closest(".rowi").dataset.i, app = S.apps.data.items[i];
  if (b.dataset.op === "edit") return openApp(app);
  if (b.dataset.op === "del" && !confirm(`‘${app.title}’을(를) 삭제할까요?`)) return;
  b.disabled = true;
  try {
    await mutate("apps", (d) => {
      const j = d.items.findIndex((x) => x.id === app.id); if (j < 0) return d;
      if (b.dataset.op === "del") d.items.splice(j, 1);
      else { const k = b.dataset.op === "up" ? j - 1 : j + 1; if (k >= 0 && k < d.items.length) [d.items[j], d.items[k]] = [d.items[k], d.items[j]]; }
      return d;
    }, b.dataset.op === "del" ? `앱 삭제: ${app.title}` : `앱 순서 변경`);
    renderApps(); if (b.dataset.op === "del") toast("삭제했습니다.");
  } catch (err) { toast(err.message, true); b.disabled = false; }
});

$("#apps-clear-sample").addEventListener("click", async () => {
  if (!confirm("예시로 들어 있는 앱을 모두 지울까요?")) return;
  try { await mutate("apps", (d) => ({ ...d, items: d.items.filter((a) => !a.sample) }), "예시 앱 삭제"); renderApps(); toast("예시 앱을 지웠습니다."); }
  catch (e) { toast(e.message, true); }
});

/* ================= 연구 ================= */
function renderResearch() {
  const all = S.research.data.items, q = $("#res-q").value.trim().toLowerCase();
  const items = all.filter((r) => !q || [r.title, r.journal, r.year, ...(r.authors || []).map((a) => a.name)].join(" ").toLowerCase().includes(q));
  $("#res-note").textContent = `${all.length}편${all.some((r) => r.hidden) ? ` (숨김 ${all.filter((r) => r.hidden).length}편)` : ""}`;
  $("#res-rows").innerHTML = items.map((r) => `<div class="rowi r ${r.hidden ? "is-hidden" : ""}" data-id="${esc(r.id)}">
      <div class="y">${esc(r.year || "")}</div>
      <div><div class="t">${esc(r.title)}${r.hidden ? '<span class="badge">숨김</span>' : ""}${r.source !== "kci" ? `<span class="badge">${esc(TYPE_LABEL[r.type] || "직접 입력")}</span>` : ""}</div>
        <div class="s">${esc((r.authors || []).map((a) => a.name).join(", "))} · ${esc(r.journal || r.publisher || "")}${r.volume ? ` ${esc(r.volume)}${r.issue ? `(${esc(r.issue)})` : ""}` : ""}</div></div>
      <div class="ops">
        <button class="btn ghost small" data-op="hide">${r.hidden ? "보이기" : "숨기기"}</button>
        <button class="btn ghost small" data-op="edit">수정</button>
        <button class="btn danger small" data-op="del">삭제</button>
      </div></div>`).join("") || `<div class="empty" style="margin-top:16px">${q ? "찾는 연구가 없습니다." : "아직 등록된 연구가 없습니다."}</div>`;
}
$("#res-q").addEventListener("input", renderResearch);

let editingRes = null;
function openRes(r) {
  editingRes = r || null;
  const f = $("#res-form"); f.reset();
  $("#res-dlg-title").textContent = r ? "연구 수정" : "연구 직접 입력";
  if (r) {
    ["type", "title", "title_en", "journal", "publisher", "year", "volume", "issue", "pages", "doi", "url", "abstract", "abstract_en"].forEach((k) => (f.elements[k].value = r[k] || ""));
    f.elements.authors.value = (r.authors || []).map((a) => a.name + (a.role === "corresponding" ? "*" : "")).join(", ");
    f.elements.keywords.value = (r.keywords || []).join(", ");
    f.elements.hidden.checked = !!r.hidden;
  } else f.elements.year.value = new Date().getFullYear();
  $("#res-dlg").showModal();
}
$("#res-new").addEventListener("click", () => openRes(null));

$("#res-save").addEventListener("click", async () => {
  const f = $("#res-form");
  if (!f.reportValidity()) return;
  const btn = $("#res-save"); btn.disabled = true;
  try {
    const v = (k) => f.elements[k].value.trim();
    const old = editingRes || {};
    const prev = Object.fromEntries((old.authors || []).map((a) => [a.name, a]));
    const authors = csv(v("authors")).map((n, i) => {
      const corr = n.endsWith("*"), name = n.replace(/\*$/, "").trim();
      return { ...(prev[name] || { name, name_en: "", affiliation: "" }), name, role: corr ? "corresponding" : (prev[name]?.role === "corresponding" ? "co" : prev[name]?.role || (i === 0 ? "first" : "co")) };
    });
    const item = { ...old, id: old.id || slug(v("title")), source: old.source || "manual", added: old.added || new Date().toISOString().slice(0, 10), authors, keywords: csv(v("keywords")) };
    ["type", "title", "title_en", "journal", "publisher", "year", "volume", "issue", "pages", "doi", "url", "abstract", "abstract_en"].forEach((k) => (item[k] = v(k)));
    if (f.elements.hidden.checked) item.hidden = true; else delete item.hidden;
    await mutate("research", (d) => {
      const i = d.items.findIndex((x) => x.id === item.id);
      if (i >= 0) d.items[i] = item; else d.items.push(item);
      d.items.sort((a, b) => String(b.year).localeCompare(String(a.year)) || (+b.volume || 0) - (+a.volume || 0) || (+b.issue || 0) - (+a.issue || 0));
      return d;
    }, `${editingRes ? "연구 수정" : "연구 추가"}: ${item.title}`);
    $("#res-dlg").close(); renderResearch(); toast("저장했습니다. 1~2분 뒤 사이트에 반영됩니다.");
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; }
});

$("#res-rows").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-op]"); if (!b) return;
  const id = b.closest(".rowi").dataset.id, r = S.research.data.items.find((x) => x.id === id);
  if (b.dataset.op === "edit") return openRes(r);
  if (b.dataset.op === "del" && !confirm(`‘${r.title}’을(를) 목록에서 삭제할까요?`)) return;
  b.disabled = true;
  try {
    await mutate("research", (d) => {
      const j = d.items.findIndex((x) => x.id === id); if (j < 0) return d;
      if (b.dataset.op === "del") d.items.splice(j, 1);
      else if (d.items[j].hidden) delete d.items[j].hidden; else d.items[j].hidden = true;
      return d;
    }, `${b.dataset.op === "del" ? "연구 삭제" : "연구 표시 변경"}: ${r.title}`);
    renderResearch();
  } catch (err) { toast(err.message, true); b.disabled = false; }
});

/* KCI 가져오기 → GitHub Actions 실행 후 결과 기다리기 */
function kciStatus(html, cls = "") { const s = $("#kci-status"); s.className = `status on ${cls}`; s.innerHTML = html; }

$("#kci-go").addEventListener("click", async () => {
  const raw = $("#kci-urls").value.trim();
  const ids = [...new Set(raw.match(/ART\d{9}/g) || [])];
  if (!ids.length) return kciStatus("KCI 논문 주소에서 논문 번호(ART로 시작)를 찾지 못했습니다. 논문 상세 페이지 주소를 넣어 주세요.", "err");
  const exists = ids.filter((id) => S.research.data.items.some((r) => r.id === id));
  if (exists.length === ids.length && !confirm("이미 등록된 논문입니다. KCI 정보로 다시 갱신할까요?")) return;

  const btn = $("#kci-go"); btn.disabled = true;
  const before = new Set(S.research.data.items.map((r) => r.id));
  const started = Date.now() - 10_000;
  try {
    kciStatus(`<span class="spinner"></span>가져오기 작업을 시작하는 중… (${ids.length}편)`);
    await gh(`${repoPath()}/actions/workflows/kci.yml/dispatches`, { method: "POST", body: { ref: cfg.branch, inputs: { urls: ids.join(" ") } } });

    let run = null, fetched = false;
    for (let t = 0; t < 120; t++) {
      await sleep(t < 5 ? 3000 : 5000);
      if (!run) {
        const runs = await gh(`${repoPath()}/actions/workflows/kci.yml/runs?event=workflow_dispatch&per_page=10`);
        run = runs.workflow_runs.find((r) => new Date(r.created_at).getTime() >= started);
        if (!run) { kciStatus(`<span class="spinner"></span>작업 대기 중…`); continue; }
      }
      const jobs = (await gh(`${repoPath()}/actions/runs/${run.id}/jobs`)).jobs;
      const fetchJob = jobs.find((j) => j.name === "fetch" || /가져오기/.test(j.name));
      if (fetchJob?.status === "completed" && !fetched) {
        if (fetchJob.conclusion !== "success") throw Object.assign(new Error("KCI 정보를 가져오지 못했습니다."), { run });
        fetched = true;
        S.research = await readJSON("research"); renderResearch();
        const added = S.research.data.items.filter((r) => !before.has(r.id));
        const updated = S.research.data.items.filter((r) => ids.includes(r.id) && before.has(r.id));
        kciStatus(`<span class="spinner"></span>정리가 끝났습니다. 사이트에 반영하는 중…<ul>${added.map((r) => `<li>추가: ${esc(r.title)}</li>`).join("")}${updated.map((r) => `<li>갱신: ${esc(r.title)}</li>`).join("")}</ul>`);
        $("#kci-urls").value = "";
      } else if (!fetched) {
        kciStatus(`<span class="spinner"></span>KCI에서 논문 정보를 읽는 중… <a href="${run.html_url}" target="_blank" rel="noopener">진행 상황</a>`);
      }
      const r2 = await gh(`${repoPath()}/actions/runs/${run.id}`);
      if (r2.status === "completed") {
        if (r2.conclusion !== "success" && !fetched) throw Object.assign(new Error("작업이 실패했습니다."), { run });
        const added = S.research.data.items.filter((r) => !before.has(r.id));
        kciStatus(`완료했습니다. ${added.length ? `${added.length}편을 추가했습니다.` : "기존 논문 정보를 갱신했습니다."} 잘못 읽힌 부분이 있으면 아래 목록에서 ‘수정’을 눌러 고칠 수 있습니다.
          <ul>${added.map((r) => `<li>${esc(r.title)} — ${esc(r.journal)} ${esc(r.year)}</li>`).join("")}</ul>`, "ok");
        return;
      }
    }
    kciStatus(`작업이 예상보다 오래 걸립니다. <a href="${run?.html_url || `https://github.com/${cfg.repo}/actions`}" target="_blank" rel="noopener">GitHub에서 진행 상황 보기</a>`, "err");
  } catch (e) {
    const link = e.run ? ` <a href="${e.run.html_url}" target="_blank" rel="noopener">자세한 기록 보기</a>` : "";
    const hint = e.status === 403 ? " 토큰에 Actions: Read and write 권한이 있는지 확인해 주세요." : e.status === 404 ? " 저장소에 .github/workflows/kci.yml 파일이 있는지 확인해 주세요." : "";
    kciStatus(esc(e.message) + hint + link, "err");
  } finally { btn.disabled = false; }
});

/* ================= 프로필 ================= */
function fillProfile() {
  const p = S.profile.data, f = $("#profile-form");
  ["name", "name_en", "university", "department", "position", "email", "office", "orcid", "bio"].forEach((k) => (f.elements[k].value = p[k] || ""));
  f.elements.interests.value = (p.interests || []).join("\n");
  f.elements.education.value = (p.education || []).join("\n");
  f.elements.career.value = (p.career || []).join("\n");
  f.elements.links.value = (p.links || []).map((l) => `${l.label} | ${l.url}`).join("\n");
  $("#photo-now").textContent = p.photo ? `현재: ${p.photo}` : "사진을 넣으면 첫 화면 ‘연구 관심’ 옆에 나옵니다.";
}
$("#profile-save").addEventListener("click", async () => {
  const f = $("#profile-form"); if (!f.reportValidity()) return;
  const btn = $("#profile-save"); btn.disabled = true; btn.textContent = "저장 중…";
  try {
    let photo = S.profile.data.photo || "";
    if (f.elements.photo_file.files[0]) photo = await uploadImage(f.elements.photo_file.files[0], "profile");
    if (f.elements.photo_remove.checked) photo = "";
    await mutate("profile", (p) => {
      ["name", "name_en", "university", "department", "position", "email", "office", "orcid", "bio"].forEach((k) => (p[k] = f.elements[k].value.trim()));
      p.interests = lines(f.elements.interests.value);
      p.education = lines(f.elements.education.value);
      p.career = lines(f.elements.career.value);
      p.links = lines(f.elements.links.value).map((l) => { const [label, ...u] = l.split("|"); return { label: label.trim(), url: u.join("|").trim() }; }).filter((l) => l.url);
      p.photo = photo;
      return p;
    }, "프로필 수정");
    fillProfile(); f.elements.photo_file.value = ""; toast("프로필을 저장했습니다.");
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; btn.textContent = "프로필 저장"; }
});

/* ---------- 시작 ---------- */
(async () => {
  if (!cfg.token) return showLogin();
  try { await connect(); startPanel(); }
  catch (e) { showLogin(e.status === 401 ? "토큰이 만료되었거나 올바르지 않습니다. 다시 입력해 주세요." : e.message); }
})();
