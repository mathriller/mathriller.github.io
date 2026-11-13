/* 관리 모드
   - 각 페이지의 '관리' 버튼을 누르면 켜진다. 앱 카드와 논문 항목에 수정·삭제·순서 버튼이 나타난다.
   - 저장은 GitHub REST API로 data/*.json 을 직접 고친다 (토큰은 이 브라우저에만 보관).
   - KCI 가져오기는 브라우저에서 KCI에 접속할 수 없으므로(CORS) GitHub Actions(kci.yml)를 실행한다. */
(() => {
  const KEY = "hp-admin", MODE = "hp-admin-mode";
  const cfg = Object.assign({ repo: "", branch: "main", token: "" }, JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || "{}"));
  const cache = {};

  /* ---------- 유틸 ---------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const csv = (s) => String(s || "").split(/[,，]/).map((x) => x.trim()).filter(Boolean);
  const lines = (s) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const slug = (s) => (String(s).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item") + "-" + Date.now().toString(36);
  const bytesToB64 = (bytes) => { let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const b64encode = (str) => bytesToB64(new TextEncoder().encode(str));
  const b64decode = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

  function toast(msg, err = false) {
    let t = $("#adm-toast");
    if (!t) { t = document.createElement("div"); t.id = "adm-toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.className = "toast on" + (err ? " err" : "");
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.className = "toast"), err ? 6000 : 3000);
  }

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
    if (!res.ok) { const e = new Error(data.message || `GitHub 오류 (${res.status})`); e.status = res.status; throw e; }
    return data;
  }
  const repo = () => `/repos/${cfg.repo}`;

  async function readJSON(name) {
    const d = await gh(`${repo()}/contents/data/${name}.json?ref=${encodeURIComponent(cfg.branch)}`);
    const content = d.content || (await gh(`${repo()}/git/blobs/${d.sha}`)).content; // 1MB 넘는 파일
    return (cache[name] = { data: JSON.parse(b64decode(content)), sha: d.sha });
  }
  const putFile = (path, base64, message, sha) =>
    gh(`${repo()}/contents/${path}`, { method: "PUT", body: { message, content: base64, branch: cfg.branch, ...(sha ? { sha } : {}) } });

  /* 최신 파일을 읽고 → 고치고 → 저장. 그사이 다른 변경이 끼어들면 다시 시도 */
  async function mutate(name, fn, message) {
    for (let i = 0; i < 3; i++) {
      const cur = await readJSON(name);
      const next = fn(structuredClone(cur.data));
      try {
        const r = await putFile(`data/${name}.json`, b64encode(JSON.stringify(next, null, 2) + "\n"), message, cur.sha);
        cache[name] = { data: next, sha: r.content.sha };
        return next;
      } catch (e) {
        if (e.status === 409 || e.status === 422) { await sleep(800); continue; }
        throw e;
      }
    }
    throw new Error("다른 변경과 겹쳐 저장하지 못했습니다. 새로고침 후 다시 시도해 주세요.");
  }

  /* 이미지: 긴 변 1400px 이하 JPEG 로 줄여서 올린다 */
  async function uploadImage(blob, base) {
    const img = await createImageBitmap(blob);
    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    const jpg = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.86));
    const path = `assets/img/${base}-${Date.now().toString(36)}.jpg`;
    await putFile(path, bytesToB64(new Uint8Array(await jpg.arrayBuffer())), `이미지 추가: ${path}`);
    return path;
  }

  function guessRepo() {
    const h = location.hostname, m = h.match(/^([^.]+)\.github\.io$/);
    if (!m) return "";
    const first = location.pathname.split("/").filter(Boolean)[0];
    return first && !first.endsWith(".html") ? `${m[1]}/${first}` : `${m[1]}/${h}`;
  }

  async function connect() {
    const r = await gh(repo());
    if (!r.permissions?.push) throw new Error("이 토큰으로는 저장소에 쓸 수 없습니다. Contents 권한을 Read and write로 설정했는지 확인해 주세요.");
  }

  /* ---------- 대화상자 ---------- */
  const AREA_OPTS = ["", ...AREAS, "기타"].map((a) => `<option value="${a}">${a || "선택 안 함"}</option>`).join("");
  const TYPE_OPTS = Object.entries(TYPE_LABEL).map(([v, l]) => `<option value="${v}">${l}</option>`).join("");

  const UI = `
  <dialog id="adm-login" class="adm-dlg">
    <div class="dhead"><h2>관리 모드</h2><button class="btn ghost small" data-close>닫기</button></div>
    <form class="dbody form" id="adm-login-form" autocomplete="off">
      <p class="full hint" style="margin:0 0 6px">GitHub 저장소에 바로 저장합니다. 토큰은 이 브라우저에만 보관되고 GitHub 말고는 어디에도 보내지 않습니다.</p>
      <label>저장소<span class="req">*</span></label><div><input type="text" name="repo" required placeholder="아이디/저장소이름"></div>
      <label>브랜치</label><div><input type="text" name="branch" value="main"></div>
      <label>토큰<span class="req">*</span></label>
      <div><input type="password" name="token" required placeholder="github_pat_로 시작하는 문자열">
        <div class="check" style="padding-top:10px"><label><input type="checkbox" name="remember" checked> 이 기기에서 기억하기</label></div></div>
      <details class="guide full">
        <summary>토큰 만드는 방법</summary>
        <ol>
          <li>GitHub에 로그인한 뒤 <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">새 Fine-grained 토큰 만들기</a>를 엽니다.</li>
          <li><b>Repository access</b>에서 <code>Only select repositories</code> → 홈페이지 저장소 하나만 고릅니다.</li>
          <li><b>Repository permissions</b>에서 <code>Contents</code>와 <code>Actions</code>를 <code>Read and write</code>로 바꿉니다.</li>
          <li><b>Generate token</b>을 누르고 나온 문자열을 위 칸에 붙여 넣습니다.</li>
        </ol>
      </details>
    </form>
    <div class="actions"><button class="btn ghost" data-close>취소</button><button class="btn" id="adm-login-go">관리 모드 켜기</button></div>
  </dialog>

  <dialog id="adm-app" class="adm-dlg">
    <div class="dhead"><h2 id="adm-app-title">앱 추가</h2><button class="btn ghost small" data-close>닫기</button></div>
    <form class="dbody form" id="adm-app-form" autocomplete="off">
      <label>앱 이름<span class="req">*</span></label><div><input type="text" name="title" required></div>
      <label>주소(URL)<span class="req">*</span></label><div><input type="url" name="url" required placeholder="https://"></div>
      <label>소개<span class="req">*</span></label><div><textarea name="summary" rows="2" required placeholder="학생이 이 앱으로 무엇을 하는지 한두 문장으로"></textarea></div>
      <label>썸네일</label>
      <div>
        <div class="drop" id="adm-drop" tabindex="0">
          <img id="adm-drop-img" alt="" hidden>
          <div class="drop-msg" id="adm-drop-msg">여기를 누른 뒤 <b>Ctrl+V</b>로 캡처 화면 붙여넣기<br><span>또는 이미지 파일을 끌어다 놓거나 눌러서 선택</span></div>
        </div>
        <input type="file" id="adm-file" accept="image/*" hidden>
        <div class="drop-row"><span class="help" id="adm-img-now"></span><button type="button" class="linkish" id="adm-img-clear">썸네일 빼기</button></div>
      </div>
      <label>영역</label>
      <div><select name="area">${AREA_OPTS}</select><div class="help">2022 개정 교육과정 영역. 썸네일이 없으면 영역에 맞는 그림이 들어갑니다.</div></div>
      <label>대상</label><div><input type="text" name="grade" list="adm-grades" placeholder="예: 초등 5–6학년"><datalist id="adm-grades"><option>초등 1–2학년</option><option>초등 3–4학년</option><option>초등 5–6학년</option><option>중학교</option><option>고등학교</option><option>예비교사</option></datalist></div>
      <label>태그</label><div><input type="text" name="tags" placeholder="쉼표로 구분 (예: 분수, 시각화)"></div>
      <label>표시</label><div class="check"><label><input type="checkbox" name="featured"> 첫 화면에 표시</label><label><input type="checkbox" name="hidden"> 숨기기</label></div>
    </form>
    <div class="actions"><button class="btn ghost" data-close>취소</button><button class="btn" id="adm-app-save">저장</button></div>
  </dialog>

  <dialog id="adm-res" class="adm-dlg">
    <div class="dhead"><h2 id="adm-res-title">연구 수정</h2><button class="btn ghost small" data-close>닫기</button></div>
    <form class="dbody form" id="adm-res-form" autocomplete="off">
      <label>구분</label><div><select name="type">${TYPE_OPTS}</select></div>
      <label>제목<span class="req">*</span></label><div><input type="text" name="title" required></div>
      <label>영문 제목</label><div><input type="text" name="title_en"></div>
      <label>저자</label><div><input type="text" name="authors" placeholder="쉼표로 구분 (예: 김화경, 송민호, 최인용*)"><div class="help">이름 뒤에 *를 붙이면 교신저자로 표시됩니다.</div></div>
      <label>학술지 / 발행처</label><div class="two"><input type="text" name="journal" placeholder="학술지명"><input type="text" name="publisher" placeholder="학회·발행기관"></div>
      <label>발행 연월 · 권 · 호</label><div class="three"><input type="text" name="date" placeholder="2026-05" pattern="\\d{4}(-\\d{2})?"><input type="text" name="volume" placeholder="권"><input type="text" name="issue" placeholder="호"></div>
      <label>쪽 · DOI</label><div class="two"><input type="text" name="pages" placeholder="223–246"><input type="text" name="doi" placeholder="10.xxxx/..."></div>
      <label>링크</label><div><input type="url" name="url" placeholder="https://"></div>
      <label>키워드</label><div><input type="text" name="keywords" placeholder="쉼표로 구분"></div>
      <label>초록</label><div><textarea name="abstract" rows="5"></textarea></div>
      <label>영문 초록</label><div><textarea name="abstract_en" rows="4"></textarea></div>
      <label>표시</label><div class="check"><label><input type="checkbox" name="hidden"> 숨기기</label></div>
    </form>
    <div class="actions"><button class="btn ghost" data-close>취소</button><button class="btn" id="adm-res-save">저장</button></div>
  </dialog>

  <dialog id="adm-prof" class="adm-dlg">
    <div class="dhead"><h2>프로필 수정</h2><button class="btn ghost small" data-close>닫기</button></div>
    <form class="dbody form" id="adm-prof-form" autocomplete="off">
      <label>이름<span class="req">*</span></label><div class="two"><input type="text" name="name" required placeholder="국문"><input type="text" name="name_en" placeholder="영문"></div>
      <label>소속</label><div class="three"><input type="text" name="university" placeholder="대학"><input type="text" name="department" placeholder="학과"><input type="text" name="position" placeholder="직위"></div>
      <label>연락처</label><div class="two"><input type="email" name="email" placeholder="이메일"><input type="text" name="office" placeholder="연구실 위치"></div>
      <label>ORCID</label><div><input type="text" name="orcid" placeholder="0000-0000-0000-0000"><div class="help">연구 목록에서 본인 이름을 표시할 때 씁니다.</div></div>
      <label>소개 글</label><div><textarea name="bio" rows="4"></textarea></div>
      <label>연구 관심</label><div><textarea name="interests" rows="6"></textarea><div class="help">한 줄에 하나씩.</div></div>
      <label>학력</label><div><textarea name="education" rows="3" placeholder="2016 | 서울대학교 수학교육과 박사"></textarea><div class="help">한 줄에 하나, <code>연도 | 내용</code></div></div>
      <label>경력</label><div><textarea name="career" rows="3" placeholder="2022– | 서울교육대학교 수학교육과 교수"></textarea></div>
      <label>링크</label><div><textarea name="links" rows="3" placeholder="Google Scholar | https://scholar.google.com/..."></textarea><div class="help">한 줄에 하나, <code>이름 | 주소</code></div></div>
      <label>사진</label><div><input type="file" name="photo_file" accept="image/*"><div class="help" id="adm-photo-now"></div>
        <div class="check"><label><input type="checkbox" name="photo_remove"> 사진 빼기</label></div></div>
    </form>
    <div class="actions"><button class="btn ghost" data-close>취소</button><button class="btn" id="adm-prof-save">저장</button></div>
  </dialog>`;

  let injected = false;
  function inject() {
    if (injected) return; injected = true;
    if (!document.querySelector('link[href$="admin.css"]')) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "assets/css/admin.css"; document.head.appendChild(l);
    }
    document.body.insertAdjacentHTML("beforeend", UI);
    $$(".adm-dlg [data-close]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); b.closest("dialog").close(); }));
    bindLogin(); bindApp(); bindRes(); bindProfile();
  }
  const busy = async (btn, label, fn) => {
    const old = btn.textContent; btn.disabled = true; btn.textContent = label;
    try { return await fn(); } catch (e) { toast(e.message, true); } finally { btn.disabled = false; btn.textContent = old; }
  };
  const refresh = () => window.PAGE?.render?.();

  /* ---------- 로그인 ---------- */
  let loginResolve = null;
  function bindLogin() {
    $("#adm-login-go").addEventListener("click", async () => {
      const f = $("#adm-login-form"); if (!f.reportValidity()) return;
      await busy($("#adm-login-go"), "확인 중…", async () => {
        Object.assign(cfg, {
          repo: f.repo.value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, ""),
          branch: f.branch.value.trim() || "main", token: f.token.value.trim(),
        });
        try { await connect(); }
        catch (e) { throw new Error(e.status === 401 ? "토큰이 올바르지 않습니다." : e.status === 404 ? "저장소를 찾을 수 없습니다. 이름과 토큰의 저장소 선택을 확인해 주세요." : e.message); }
        localStorage.removeItem(KEY); sessionStorage.removeItem(KEY);
        (f.remember.checked ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(cfg));
        $("#adm-login").close(); loginResolve?.(true);
      });
    });
  }

  /* ---------- 관리 막대 ---------- */
  function bar() {
    document.body.classList.add("adm-on");
    document.body.insertAdjacentHTML("beforeend", `<div class="adm-bar">
      <span><b>관리 모드</b> · 저장하면 1~2분 뒤 공개 사이트에 반영됩니다</span>
      <span class="adm-bar-ops">
        <button class="adm-link" data-adm="profile">프로필 수정</button>
        <a class="adm-link" href="https://github.com/${esc(cfg.repo)}/actions" target="_blank" rel="noopener">배포 상황</a>
        <button class="adm-link" data-adm="forget">토큰 지우기</button>
        <button class="adm-link strong" data-adm="exit">관리 모드 끄기</button>
      </span></div>`);
    $(".adm-bar").addEventListener("click", (e) => {
      const b = e.target.closest("[data-adm]"); if (!b) return;
      if (b.dataset.adm === "profile") Admin.editProfile();
      if (b.dataset.adm === "exit") Admin.exit();
      if (b.dataset.adm === "forget" && confirm("이 기기에 저장된 GitHub 토큰을 지우고 관리 모드를 끌까요?")) { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); Admin.exit(); }
    });
  }

  /* ================= 앱 ================= */
  let editingApp = null, pendingImg = null, clearImg = false;
  function setPreview(src) {
    const img = $("#adm-drop-img");
    img.hidden = !src; if (src) img.src = src;
    $("#adm-drop-msg").hidden = !!src;
  }
  function takeImage(file) {
    if (!file || !file.type.startsWith("image/")) return toast("이미지 파일이 아닙니다.", true);
    pendingImg = file; clearImg = false;
    setPreview(URL.createObjectURL(file));
    $("#adm-img-now").textContent = "저장할 때 올라갑니다.";
  }
  function bindApp() {
    const drop = $("#adm-drop"), file = $("#adm-file");
    drop.addEventListener("click", () => file.click());
    drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); file.click(); } });
    file.addEventListener("change", () => file.files[0] && takeImage(file.files[0]));
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); takeImage(e.dataTransfer.files[0]); });
    // 대화상자 어디서든 Ctrl+V 하면 썸네일로 받는다 (글자 입력 칸에 글자를 붙여넣는 경우는 제외)
    $("#adm-app").addEventListener("paste", (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      if (item) { e.preventDefault(); takeImage(item.getAsFile()); }
    });
    $("#adm-img-clear").addEventListener("click", () => { pendingImg = null; clearImg = true; setPreview(null); $("#adm-img-now").textContent = "썸네일 없이 저장합니다(영역 그림 사용)."; });

    $("#adm-app-save").addEventListener("click", async () => {
      const f = $("#adm-app-form"); if (!f.reportValidity()) return;
      await busy($("#adm-app-save"), "저장 중…", async () => {
        const v = (k) => f.elements[k].value.trim();
        const id = editingApp?.id || slug(v("title"));
        let image = clearImg ? "" : (editingApp?.image || "");
        if (pendingImg) image = await uploadImage(pendingImg, "apps/app");
        const app = { ...(editingApp || {}), id, title: v("title"), summary: v("summary"), url: v("url"), image, area: v("area"), grade: v("grade"), tags: csv(v("tags")) };
        delete app.sample;
        if (f.elements.featured.checked) app.featured = true; else delete app.featured;
        if (f.elements.hidden.checked) app.hidden = true; else delete app.hidden;
        await mutate("apps", (d) => {
          const i = d.items.findIndex((x) => x.id === id);
          if (i >= 0) d.items[i] = app; else d.items.unshift(app);
          return d;
        }, `${editingApp ? "앱 수정" : "앱 추가"}: ${app.title}`);
        $("#adm-app").close(); toast("저장했습니다."); refresh();
      });
    });
  }

  async function appOp(op, id, btn) {
    const app = cache.apps.data.items.find((x) => x.id === id);
    if (op === "edit") return Admin.editApp(id);
    if (op === "del" && !confirm(`‘${app.title}’을(를) 삭제할까요?`)) return;
    await busy(btn, "…", async () => {
      await mutate("apps", (d) => {
        const j = d.items.findIndex((x) => x.id === id); if (j < 0) return d;
        if (op === "del") d.items.splice(j, 1);
        else if (op === "hide") { if (d.items[j].hidden) delete d.items[j].hidden; else d.items[j].hidden = true; }
        else { const k = op === "prev" ? j - 1 : j + 1; if (k >= 0 && k < d.items.length) [d.items[j], d.items[k]] = [d.items[k], d.items[j]]; }
        return d;
      }, { del: `앱 삭제: ${app.title}`, hide: `앱 표시 변경: ${app.title}` }[op] || "앱 순서 변경");
      refresh();
    });
  }

  /* ================= 연구 ================= */
  let editingRes = null;
  const RES_FIELDS = ["type", "title", "title_en", "journal", "publisher", "date", "volume", "issue", "pages", "doi", "url", "abstract", "abstract_en"];
  function bindRes() {
    $("#adm-res-save").addEventListener("click", async () => {
      const f = $("#adm-res-form"); if (!f.reportValidity()) return;
      await busy($("#adm-res-save"), "저장 중…", async () => {
        const v = (k) => f.elements[k].value.trim();
        const old = editingRes || {};
        const prev = Object.fromEntries((old.authors || []).map((a) => [a.name, a]));
        const authors = csv(v("authors")).map((n, i) => {
          const corr = n.endsWith("*"), name = n.replace(/\*$/, "").trim(), p = prev[name];
          return { ...(p || { name, name_en: "", affiliation: "" }), name, role: corr ? "corresponding" : p?.role && p.role !== "corresponding" ? p.role : i === 0 ? "first" : "co" };
        });
        const item = { ...old, id: old.id || slug(v("title")), source: old.source || "manual", added: old.added || new Date().toISOString().slice(0, 10), authors, keywords: csv(v("keywords")) };
        RES_FIELDS.forEach((k) => (item[k] = v(k)));
        item.year = (item.date || "").slice(0, 4) || old.year || "";
        if (f.elements.hidden.checked) item.hidden = true; else delete item.hidden;
        await mutate("research", (d) => {
          const i = d.items.findIndex((x) => x.id === item.id);
          if (i >= 0) d.items[i] = item; else d.items.push(item);
          d.items.sort((a, b) => String(b.date || b.year).localeCompare(String(a.date || a.year)));
          return d;
        }, `${editingRes ? "연구 수정" : "연구 추가"}: ${item.title}`);
        $("#adm-res").close(); toast("저장했습니다."); refresh();
      });
    });
  }

  async function resOp(op, id, btn) {
    const r = cache.research.data.items.find((x) => x.id === id);
    if (op === "edit") return Admin.editRes(id);
    if (op === "del" && !confirm(`‘${r.title}’을(를) 목록에서 삭제할까요?`)) return;
    await busy(btn, "…", async () => {
      await mutate("research", (d) => {
        const j = d.items.findIndex((x) => x.id === id); if (j < 0) return d;
        if (op === "del") d.items.splice(j, 1);
        else if (d.items[j].hidden) delete d.items[j].hidden; else d.items[j].hidden = true;
        return d;
      }, `${op === "del" ? "연구 삭제" : "연구 표시 변경"}: ${r.title}`);
      refresh();
    });
  }

  /* KCI 가져오기: GitHub Actions 실행 → 진행 상황 확인 → 목록 새로 읽기 */
  async function kciImport(panel) {
    const status = (html, cls = "") => { const s = $(".status", panel); s.className = `status on ${cls}`; s.innerHTML = html; };
    const raw = $("textarea", panel).value.trim();
    const ids = [...new Set(raw.match(/ART\d{9}/g) || [])];
    if (!ids.length) return status("KCI 논문 주소에서 논문 번호(ART로 시작)를 찾지 못했습니다. 논문 상세 페이지 주소를 넣어 주세요.", "err");
    const items = cache.research.data.items;
    if (ids.every((id) => items.some((r) => r.id === id)) && !confirm("이미 등록된 논문입니다. KCI 정보로 다시 갱신할까요?")) return;

    const btn = $("button", panel); btn.disabled = true;
    const before = new Set(items.map((r) => r.id)), started = Date.now() - 10_000;
    try {
      status(`<span class="spinner"></span>가져오기 작업을 시작하는 중… (${ids.length}편)`);
      await gh(`${repo()}/actions/workflows/kci.yml/dispatches`, { method: "POST", body: { ref: cfg.branch, inputs: { urls: ids.join(" ") } } });
      let run = null, fetched = false;
      for (let t = 0; t < 120; t++) {
        await sleep(t < 5 ? 3000 : 5000);
        if (!run) {
          const runs = await gh(`${repo()}/actions/workflows/kci.yml/runs?event=workflow_dispatch&per_page=10`);
          run = runs.workflow_runs.find((r) => new Date(r.created_at).getTime() >= started);
          if (!run) { status(`<span class="spinner"></span>작업 대기 중…`); continue; }
        }
        if (!fetched) {
          const jobs = (await gh(`${repo()}/actions/runs/${run.id}/jobs`)).jobs;
          const job = jobs.find((j) => j.name === "fetch");
          if (job?.status === "completed") {
            if (job.conclusion !== "success") throw Object.assign(new Error("KCI 정보를 가져오지 못했습니다."), { run });
            fetched = true;
            await readJSON("research"); refresh();
            $("textarea", panel).value = "";
          } else status(`<span class="spinner"></span>KCI에서 논문 정보를 읽는 중… <a href="${run.html_url}" target="_blank" rel="noopener">진행 상황</a>`);
        }
        if (fetched) {
          const added = cache.research.data.items.filter((r) => !before.has(r.id));
          const r2 = await gh(`${repo()}/actions/runs/${run.id}`);
          const list = `<ul>${added.map((r) => `<li>${esc(r.title)} — ${esc(r.journal)} ${esc(r.date || r.year)}</li>`).join("")}</ul>`;
          const head = added.length ? `${added.length}편을 추가했습니다.` : "기존 논문 정보를 갱신했습니다.";
          if (r2.status === "completed") return status(`${head} 공개 사이트에도 반영되었습니다. 잘못 읽힌 부분은 각 논문의 ‘수정’으로 고칠 수 있습니다.${list}`, "ok");
          status(`<span class="spinner"></span>${head} 공개 사이트에 반영하는 중…${list}`);
        }
      }
      status(`작업이 예상보다 오래 걸립니다. <a href="${run?.html_url || `https://github.com/${cfg.repo}/actions`}" target="_blank" rel="noopener">GitHub에서 진행 상황 보기</a>`, "err");
    } catch (e) {
      const link = e.run ? ` <a href="${e.run.html_url}" target="_blank" rel="noopener">자세한 기록 보기</a>` : "";
      const hint = e.status === 403 ? " 토큰에 Actions: Read and write 권한이 있는지 확인해 주세요." : e.status === 404 ? " 저장소에 .github/workflows/kci.yml 파일이 있는지 확인해 주세요." : "";
      status(esc(e.message) + hint + link, "err");
    } finally { btn.disabled = false; }
  }

  /* ================= 프로필 ================= */
  const PROF_FIELDS = ["name", "name_en", "university", "department", "position", "email", "office", "orcid", "bio"];
  function bindProfile() {
    $("#adm-prof-save").addEventListener("click", async () => {
      const f = $("#adm-prof-form"); if (!f.reportValidity()) return;
      await busy($("#adm-prof-save"), "저장 중…", async () => {
        let photo = cache.profile?.data.photo || "";
        if (f.photo_file.files[0]) photo = await uploadImage(f.photo_file.files[0], "profile");
        if (f.photo_remove.checked) photo = "";
        await mutate("profile", (p) => {
          PROF_FIELDS.forEach((k) => (p[k] = f.elements[k].value.trim()));
          p.interests = lines(f.interests.value);
          p.education = lines(f.education.value);
          p.career = lines(f.career.value);
          p.links = lines(f.links.value).map((l) => { const [label, ...u] = l.split("|"); return { label: label.trim(), url: u.join("|").trim() }; }).filter((l) => l.url);
          p.photo = photo;
          return p;
        }, "프로필 수정");
        $("#adm-prof").close(); toast("프로필을 저장했습니다."); refresh();
      });
    });
  }

  /* ================= 공개 인터페이스 ================= */
  const Admin = {
    on: false,
    repo: () => cfg.repo,

    /* 페이지를 열 때: 관리 모드가 켜져 있으면 연결 확인 */
    async start() {
      if (!cfg.token) { sessionStorage.removeItem(MODE); return false; }
      try { await connect(); }
      catch (e) { sessionStorage.removeItem(MODE); inject(); toast(e.status === 401 ? "토큰이 만료되었거나 올바르지 않습니다. 관리 버튼을 눌러 다시 연결해 주세요." : e.message, true); return false; }
      this.on = true; inject(); bar();
      return true;
    },

    /* '관리' 버튼 */
    async enter() {
      inject();
      if (!cfg.token) {
        const f = $("#adm-login-form");
        f.repo.value = cfg.repo || guessRepo(); f.branch.value = cfg.branch || "main";
        $("#adm-login").showModal();
        const ok = await new Promise((r) => { loginResolve = r; $("#adm-login").addEventListener("close", () => r(false), { once: true }); });
        if (!ok) return;
      }
      sessionStorage.setItem(MODE, "on");
      location.reload();
    },
    exit() { sessionStorage.removeItem(MODE); location.reload(); },

    /* 관리 모드에서는 공개 사이트 대신 GitHub에서 최신 데이터를 읽는다 (배포 지연 없이 바로 보이도록) */
    async data(name) { return structuredClone((cache[name] || (await readJSON(name))).data); },

    editApp(id) {
      editingApp = id ? cache.apps.data.items.find((x) => x.id === id) : null;
      pendingImg = null; clearImg = false; $("#adm-file").value = "";
      const f = $("#adm-app-form"), a = editingApp || {}; f.reset();
      $("#adm-app-title").textContent = editingApp ? "앱 수정" : "앱 추가";
      ["title", "url", "summary", "area", "grade"].forEach((k) => (f.elements[k].value = a[k] || ""));
      f.elements.tags.value = (a.tags || []).join(", ");
      f.elements.featured.checked = !!a.featured; f.elements.hidden.checked = !!a.hidden;
      setPreview(a.image || null);
      $("#adm-img-now").textContent = a.image ? "" : "썸네일이 없으면 영역에 맞는 그림이 들어갑니다.";
      $("#adm-app").showModal();
    },
    editRes(id) {
      editingRes = id ? cache.research.data.items.find((x) => x.id === id) : null;
      const f = $("#adm-res-form"), r = editingRes || {}; f.reset();
      $("#adm-res-title").textContent = editingRes ? "연구 수정" : "연구 직접 입력";
      RES_FIELDS.forEach((k) => (f.elements[k].value = r[k] || ""));
      if (!r.date) f.elements.date.value = r.year || new Date().toISOString().slice(0, 7);
      if (!r.type) f.elements.type.value = "journal";
      f.elements.authors.value = (r.authors || []).map((a) => a.name + (a.role === "corresponding" ? "*" : "")).join(", ");
      f.elements.keywords.value = (r.keywords || []).join(", ");
      f.elements.hidden.checked = !!r.hidden;
      $("#adm-res").showModal();
    },
    async editProfile() {
      const p = await this.data("profile"), f = $("#adm-prof-form"); f.reset();
      PROF_FIELDS.forEach((k) => (f.elements[k].value = p[k] || ""));
      f.interests.value = (p.interests || []).join("\n");
      f.education.value = (p.education || []).join("\n");
      f.career.value = (p.career || []).join("\n");
      f.links.value = (p.links || []).map((l) => `${l.label} | ${l.url}`).join("\n");
      $("#adm-photo-now").textContent = p.photo ? `현재: ${p.photo}` : "";
      $("#adm-prof").showModal();
    },

    /* 페이지가 그린 뒤에 호출: 카드와 논문에 관리 버튼을 붙인다 */
    decorate() {
      if (!this.on) return;
      $$(".app[data-id]").forEach((card) => {
        if ($(".adm-ops", card)) return;
        const a = cache.apps?.data.items.find((x) => x.id === card.dataset.id) || {};
        card.classList.toggle("adm-hidden", !!a.hidden);
        card.insertAdjacentHTML("beforeend", `<div class="adm-ops" data-kind="app">
          <button data-op="prev" title="앞으로">◀</button><button data-op="next" title="뒤로">▶</button>
          <button data-op="edit">수정</button><button data-op="hide">${a.hidden ? "보이기" : "숨기기"}</button><button data-op="del" class="danger">삭제</button></div>
          ${a.hidden ? '<span class="adm-flag">숨김</span>' : ""}`);
      });
      $$("[data-adm-add-app]").forEach((grid) => {
        if ($(".adm-add", grid)) return;
        grid.insertAdjacentHTML("afterbegin", `<button class="adm-add" type="button"><span>+</span>새 앱 추가</button>`);
        $(".adm-add", grid).addEventListener("click", () => this.editApp(null));
      });
      $$(".pub[data-id]").forEach((el) => {
        if ($(".adm-ops", el)) return;
        const r = cache.research?.data.items.find((x) => x.id === el.dataset.id) || {};
        el.classList.toggle("adm-hidden", !!r.hidden);
        $("h3", el)?.insertAdjacentHTML("afterbegin", r.hidden ? '<span class="adm-flag inline">숨김</span>' : "");
        el.insertAdjacentHTML("beforeend", `<div class="adm-ops inline" data-kind="res">
          <button data-op="edit">수정</button><button data-op="hide">${r.hidden ? "보이기" : "숨기기"}</button><button data-op="del" class="danger">삭제</button></div>`);
      });
      $$("[data-adm-kci]").forEach((slot) => {
        if (slot.dataset.ready) return; slot.dataset.ready = 1;
        slot.innerHTML = `<div class="adm-panel">
          <div class="adm-panel-head"><h2>논문 추가</h2><button class="btn ghost small" type="button" data-manual>직접 입력</button></div>
          <p class="hint">KCI 논문 상세 페이지 주소를 붙여 넣으면 제목, 저자·소속, 학술지, 권호, 발행 연월, 초록, 키워드를 자동으로 정리합니다. 여러 편은 줄을 바꿔 넣으세요.</p>
          <div class="kci-box"><textarea class="input" placeholder="https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART00..."></textarea>
          <button class="btn" type="button" data-kci>KCI에서 가져오기</button></div>
          <div class="status"></div></div>`;
        $("[data-kci]", slot).addEventListener("click", () => kciImport(slot));
        $("[data-manual]", slot).addEventListener("click", () => this.editRes(null));
      });
      $$("[data-adm-profile]").forEach((slot) => {
        if (slot.dataset.ready) return; slot.dataset.ready = 1;
        slot.insertAdjacentHTML("beforeend", `<button class="btn ghost adm-inline-btn" type="button">프로필 수정</button>`);
        $(".adm-inline-btn", slot).addEventListener("click", () => this.editProfile());
      });
    },
  };

  // 카드 안의 관리 버튼은 링크 이동 대신 동작만 한다
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".adm-ops button"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const host = b.closest("[data-id]"), kind = b.closest(".adm-ops").dataset.kind;
    (kind === "app" ? appOp : resOp)(b.dataset.op, host.dataset.id, b);
  }, true);

  window.Admin = Admin;
})();
