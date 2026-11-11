#!/usr/bin/env python3
"""KCI 논문 페이지에서 서지 정보를 추출해 data/research.json 에 추가한다.

사용법
  python scripts/kci.py show  <KCI URL 또는 ART 번호>
  python scripts/kci.py add   <KCI URL 또는 ART 번호> [...]   (data/research.json 갱신)
  python scripts/kci.py refresh                               (저장된 KCI 논문 정보를 다시 받아옴)

표준 라이브러리만 사용한다 (GitHub Actions 에서 별도 설치 없이 실행).
"""
from __future__ import annotations

import datetime as _dt
import html
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "research.json"
VIEW_URL = "https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId={}"
LANDING_URL = "https://www.kci.go.kr/kciportal/landing/article.kci?arti_id={}"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

HANGUL = re.compile(r"[가-힣]")
ROLE = {"제1": "first", "교신": "corresponding", "참여": "co", "공동": "co"}


class KciError(Exception):
    pass


def article_id(text: str) -> str:
    m = re.search(r"ART\d{9}", text or "")
    if not m:
        raise KciError(f"KCI 논문 번호(ART로 시작하는 번호)를 찾을 수 없습니다: {text}")
    return m.group(0)


def fetch_html(arti_id: str) -> str:
    req = urllib.request.Request(VIEW_URL.format(arti_id), headers={"User-Agent": UA, "Accept-Language": "ko"})
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # 네트워크 일시 오류 재시도
            last = e
            time.sleep(2 * (attempt + 1))
    raise KciError(f"KCI 페이지를 불러오지 못했습니다 ({arti_id}): {last}")


def _clean(s: str | None) -> str:
    if not s:
        return ""
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def _hidden(page: str, name: str) -> str:
    m = re.search(r'id="%s"\s+value=(["\'])(.*?)\1' % re.escape(name), page, re.S)
    return _clean(m.group(2)) if m else ""


def _meta(page: str, name: str) -> str:
    m = re.search(r'<meta name="%s" content="([^"]*)"' % re.escape(name), page)
    return _clean(m.group(1)) if m else ""


def parse(page: str, arti_id: str) -> dict:
    if "artiTitle" not in page:
        raise KciError(f"논문 정보를 찾을 수 없습니다. 주소를 확인해 주세요 ({arti_id})")

    # 제목: 첫 번째 h4 안의 strong#artiTitle (국문), small.eng (영문)
    h4 = re.search(r'<h4 class="content-h4".*?</h4>', page, re.S)
    block = h4.group(0) if h4 else page
    t = re.search(r'<strong id="artiTitle">(.*?)</strong>', block, re.S)
    title = _clean(t.group(1)) if t else _meta(page, "citation_title")
    e = re.search(r'<small class="eng">(.*?)</small>', block, re.S)
    title_en = _clean(e.group(1)) if e else ""
    if not title_en and not HANGUL.search(_meta(page, "citation_title")):
        title_en = _meta(page, "citation_title")
    if title_en == title:
        title_en = ""

    # 저자: 본문의 저자 블록(이름, 위첨자 번호, ORCID)과 소속 블록을 맞춰 읽는다.
    authors = []
    attach = re.search(r'<div class="attach">(.*?)</div>', page, re.S)
    affil_by_num = {}
    if attach:
        for num, name in re.findall(r'<sup class="num">\s*(\d+)\s*</sup>(.*?)</p>', attach.group(1), re.S):
            affil_by_num[num] = _clean(name)
    auth_div = re.search(r'<div class="author">(.*?)</div>', page, re.S)
    if auth_div:
        for c in re.split(r",&nbsp;", auth_div.group(1)):
            a = re.search(r'<a [^>]*poCretDetail[^>]*>(.*?)</a>', c, re.S) or re.search(r"<a [^>]*>(.*?)</a>", c, re.S)
            text = _clean(a.group(1) if a else c).replace("，", ",")
            if not text:
                continue
            ko, _, en = text.partition("/")
            ko, en = re.sub(r"\s+", " ", ko).strip(), re.sub(r"\s+", " ", en).strip()
            if not HANGUL.search(ko) and not en:
                ko, en = ko, ko
            sup = re.search(r'<sup class="num">\s*(\d+)', c)
            orcid = re.search(r"orcid\.org/([0-9X-]{19})", c)
            item = {"name": ko, "name_en": en, "role": "co",
                    "affiliation": affil_by_num.get(sup.group(1), "") if sup else ""}
            if orcid:
                item["orcid"] = orcid.group(1)
            authors.append(item)
    # 역할(제1/교신 저자): "김화경/Kim, Hwakyung(제1),송민호/Minho Song(참여),최인용/Choi, Inyong(교신)"
    raw_auth = _hidden(page, "hdnAuthor").replace("，", ",")
    pos = [raw_auth.find(a["name"]) for a in authors]
    for i, a in enumerate(authors):
        if pos[i] < 0:
            continue
        nxt = min([p for p in pos if p > pos[i]] or [len(raw_auth)])
        r = re.search(r"\(([^()]*)\)", raw_auth[pos[i]:nxt])
        if r:
            a["role"] = ROLE.get(r.group(1).strip(), "co")
    if not authors:
        affils = [x.strip() for x in _hidden(page, "hdnInsiNm").split(",")]
        for i, n in enumerate(re.findall(r'<meta name="citation_author" content="([^"]*)"', page)):
            authors.append({"name": _clean(n), "name_en": "", "role": "co",
                            "affiliation": affils[i] if i < len(affils) else ""})

    # 권호: "2026, vol.65no.2,193호 pp. 223-246(24 pages)"
    vol_info = _hidden(page, "hdnVolInfo")
    year = _meta(page, "citation_publication_date") or (re.match(r"(\d{4})", vol_info) or [None, ""])[1]
    vm = re.search(r"vol\.?\s*([\w-]+?)\s*(?=no|,|$)", vol_info)
    nm = re.search(r"no\.?\s*([\w-]+)", vol_info)
    pm = re.search(r"pp\.?\s*([\d]+)\s*-\s*([\d]+)", vol_info)
    volume = (vm.group(1) if vm else "") or _meta(page, "citation_volume")
    issue = (nm.group(1) if nm else "") or _meta(page, "citation_issue")
    pages = f"{pm.group(1)}–{pm.group(2)}" if pm else ""

    # 키워드: 국문, 영문이 쉼표로 이어져 있고 영문이 두 번 반복되는 경우가 있다
    kw_ko, kw_en, seen = [], [], set()
    for k in _hidden(page, "hdnKeyWords").split(","):
        k = k.strip()
        if not k or k.lower() in seen:
            continue
        seen.add(k.lower())
        (kw_ko if HANGUL.search(k) else kw_en).append(k)

    def abst(id_):
        m = re.search(r'<p id="%s"[^>]*>(.*?)</p>' % id_, page, re.S)
        return _clean(m.group(1)) if m else ""

    level = ""
    lm = re.search(r'type-ico\d? ico">\s*(KCI [^<]+?)\s*<', page)
    if lm:
        level = lm.group(1)

    journal = _hidden(page, "hdnJournalNm") or _meta(page, "citation_journal_title")
    return {
        "id": arti_id,
        "type": "journal",
        "title": title,
        "title_en": title_en,
        "authors": authors,
        "journal": journal,
        "publisher": _hidden(page, "hdnPublisher") or _meta(page, "citation_publisher"),
        "year": year,
        "volume": volume,
        "issue": issue,
        "pages": pages,
        "doi": _hidden(page, "hdnDoi") or _meta(page, "citation_doi"),
        "keywords": kw_ko,
        "keywords_en": kw_en,
        "abstract": abst("korAbst"),
        "abstract_en": abst("engAbst"),
        "kci_level": level,
        "url": LANDING_URL.format(arti_id),
        "source": "kci",
        "added": _dt.date.today().isoformat(),
    }


def fetch(text: str) -> dict:
    aid = article_id(text)
    return parse(fetch_html(aid), aid)


def load() -> dict:
    if DATA.exists():
        return json.loads(DATA.read_text(encoding="utf-8"))
    return {"items": []}


def sort_key(it: dict):
    def num(x):
        m = re.match(r"\d+", str(x or ""))
        return int(m.group(0)) if m else 0
    return (num(it.get("year")), num(it.get("volume")), num(it.get("issue")), it.get("added", ""))


def save(data: dict) -> None:
    data["items"].sort(key=sort_key, reverse=True)
    data["updated"] = _dt.datetime.now(_dt.timezone(_dt.timedelta(hours=9))).isoformat(timespec="seconds")
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def summary(lines: list[str]) -> None:
    out = os.environ.get("GITHUB_STEP_SUMMARY")
    text = "\n".join(lines) + "\n"
    print(text)
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(text)


def cmd_add(args: list[str]) -> int:
    tokens = [t for a in args for t in re.split(r"[\s,]+", a) if t.strip()]
    ids = []
    for t in tokens:
        try:
            aid = article_id(t)
            if aid not in ids:
                ids.append(aid)
        except KciError as e:
            summary([f"- 건너뜀: {e}"])
    if not ids:
        summary(["추가할 KCI 논문 주소가 없습니다."])
        return 1
    data = load()
    by_id = {it.get("id"): it for it in data["items"]}
    lines, failed = ["## KCI 논문 가져오기 결과", ""], 0
    for aid in ids:
        try:
            item = fetch(aid)
        except KciError as e:
            lines.append(f"- 실패 {aid}: {e}")
            failed += 1
            continue
        old = by_id.get(aid)
        if old:
            # 관리자가 직접 고친 값(숨김, 대표 논문, 메모 등)은 유지
            for k in ("hidden", "featured", "note", "category", "added", "links"):
                if k in old:
                    item[k] = old[k]
            old.clear()
            old.update(item)
            lines.append(f"- 갱신: {item['title']} ({item['journal']}, {item['year']})")
        else:
            data["items"].append(item)
            by_id[aid] = item
            lines.append(f"- 추가: {item['title']} ({item['journal']}, {item['year']})")
        time.sleep(1)
    save(data)
    summary(lines)
    return 1 if failed == len(ids) else 0


def cmd_refresh() -> int:
    ids = [it["id"] for it in load()["items"] if it.get("source") == "kci"]
    return cmd_add(ids) if ids else 0


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    cmd, rest = argv[1], argv[2:]
    if cmd == "show":
        for t in rest:
            print(json.dumps(fetch(t), ensure_ascii=False, indent=2))
        return 0
    if cmd == "add":
        return cmd_add(rest)
    if cmd == "refresh":
        return cmd_refresh()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
