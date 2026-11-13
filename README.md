# 최인용 · 서울교육대학교 수학교육과 홈페이지

수업용 앱 소개와 연구 목록을 담은 개인 홈페이지입니다. GitHub Pages로 무료로 운영되고,
각 페이지의 **관리** 버튼으로 앱, 연구, 프로필을 그 자리에서 바로 고칠 수 있습니다.

| 페이지 | 파일 | 내용 |
|---|---|---|
| 소개 | `index.html` | 이름, 소개 글, 대표 앱 3개, 최근 연구 5편, 연구 관심 |
| 수업용 앱 | `apps.html` | 앱 카드 목록. 영역(2022 개정 교육과정 4개 영역)과 대상별 필터 |
| 연구 | `research.html` | 연도별 논문 목록, 검색, 키워드 필터, 초록 펼치기 |
| 관리 | 각 페이지의 **관리** 버튼 | 카드·논문에서 바로 수정·삭제·순서 변경, KCI 주소로 논문 추가, 프로필 수정 |

---

## 1. 처음 한 번만: GitHub에 올리기

1. [github.com](https://github.com)에 로그인합니다.
2. 오른쪽 위 **+ → New repository**를 누릅니다.
   - Repository name: **`아이디.github.io`** (예: 아이디가 `inyongchoi`이면 `inyongchoi.github.io`)
     → 주소가 `https://inyongchoi.github.io`가 됩니다.
     다른 이름(예: `homepage`)으로 만들면 `https://아이디.github.io/homepage`가 됩니다.
   - **Public**을 선택하고 **Create repository**를 누릅니다.
3. 이 폴더의 파일을 모두 저장소에 올립니다. 아래 둘 중 편한 방법을 쓰면 됩니다.
   - **GitHub Desktop**(추천): 저장소를 내 컴퓨터로 Clone한 뒤, 그 폴더에 이 폴더 안의 파일을 모두 복사하고 Commit → Push 합니다.
   - **명령어**(이 폴더에서 실행):
     ```bash
     git remote add origin https://github.com/아이디/아이디.github.io.git
     git push -u origin main
     ```
   > 웹 화면에 파일을 끌어다 놓는 방법은 `.github` 폴더(숨김 폴더)가 빠지기 쉬워서 권하지 않습니다.
   > 이 폴더가 없으면 사이트 배포와 KCI 가져오기가 동작하지 않습니다.
4. 저장소의 **Settings → Pages**에서 **Source**를 **GitHub Actions**로 바꿉니다.
5. **Actions** 탭에서 ‘사이트 배포’를 열고 **Run workflow**를 한 번 누릅니다.
   1~2분 뒤 `https://아이디.github.io`에서 홈페이지가 열립니다.
   그다음부터는 저장할 때마다 자동으로 배포됩니다.

## 2. 관리 모드

어느 페이지에서든 오른쪽 위 **관리** 버튼을 누르면 관리 모드가 켜집니다.
처음 한 번은 GitHub 토큰을 묻고, 그다음부터는 그 브라우저에서 버튼만 누르면 됩니다.
관리 모드에서는 GitHub에 저장된 최신 내용을 바로 보여 주고, 공개 사이트에는 저장 후 1~2분 뒤 반영됩니다.

**토큰 만들기 (기기마다 한 번)**
1. [새 Fine-grained 토큰 만들기](https://github.com/settings/personal-access-tokens/new)를 엽니다.
2. Repository access → **Only select repositories** → `mathriller.github.io`를 고릅니다.
3. Repository permissions에서 **Contents**와 **Actions**를 각각 **Read and write**로 바꿉니다.
4. Generate token을 누르고, 나온 문자열을 관리 버튼을 누르면 뜨는 창에 붙여 넣습니다.

### 앱 관리 (수업용 앱 페이지)
- 맨 앞의 **새 앱 추가** 카드를 누릅니다. 썸네일 칸을 누른 뒤 **Ctrl+V**로 캡처 화면을 붙여 넣거나, 이미지 파일을 끌어다 놓으면 됩니다.
- 카드마다 ◀ ▶(순서), 수정, 숨기기, 삭제 버튼이 나옵니다. 숨긴 앱은 관리 모드에서만 흐리게 보입니다.
- ‘첫 화면에 표시’를 체크한 앱이 소개 페이지에 나옵니다(최대 4개).

### 논문 관리 (연구 페이지)
- 맨 위 **논문 추가** 칸에 KCI 논문 상세 페이지 주소를 붙여 넣고 ‘KCI에서 가져오기’를 누릅니다. 여러 편은 줄을 바꿔 넣습니다.
  제목(국문·영문), 저자와 소속, 교신저자, 학술지, 권·호·쪽, 발행 연월, DOI, 키워드, 초록을 정리합니다. 보통 1분 안팎 걸립니다.
- 브라우저는 보안 정책(CORS) 때문에 KCI를 직접 읽을 수 없어서, GitHub 서버에서 `scripts/kci.py`가 읽어 `data/research.json`에 저장합니다(`.github/workflows/kci.yml`).
- KCI에 없는 국외 논문, 학술발표, 저서는 ‘직접 입력’으로 넣습니다.
- 논문마다 수정, 숨기기, 삭제 버튼이 나옵니다.

### 프로필
관리 모드 아래쪽 막대의 **프로필 수정**에서 소개 글, 연구 관심, 학력, 경력, 연락처, 사진을 고칩니다.

## 3. 지금 들어 있는 데이터

- `data/apps.json`: 옛 홈페이지(mathriller.dothome.co.kr)의 도구 15개. 제목과 설명은 그대로 가져왔고, 영역과 태그는 새로 붙였습니다.

## 3-1. 도구 (`tools/`)

옛 닷홈 서버의 도구를 이 저장소로 옮겼습니다. 주소는 `https://mathriller.github.io/tools/폴더이름/` 입니다.

- **바로 고칠 수 있는 도구** (파일이 곧 원본): tiling, fractal, expattern, dcompas, probability, grapher, pocket, clairaut2, clairaut3, boxplot(한 파일로 빌드됨)
- **React(Vite)로 빌드된 도구**: voxel, bargraph, clairaut0, clairaut1, moving, moving2, moving3, daeching
  - 각 폴더의 `assets/`에 빌드 결과물이 들어 있습니다. 고치려면 원본 프로젝트에서 `vite.config.js`에 `base: './'`를 넣고 빌드한 뒤, 나온 `dist/` 안의 내용으로 그 폴더를 바꾸면 됩니다.
- 홈페이지 카드에 없는 도구: moving2(로봇 컨트롤러), moving3, daeching(선대칭 탐구), pocket_old. 필요하면 관리 모드에서 카드를 추가하세요.
- 옮기지 않은 것: ratiochat(PHP와 데이터베이스가 필요해 GitHub Pages에서 동작하지 않음), calculator·geometry·matrix(내용 없는 자리표시 페이지)

새 도구는 `tools/새폴더/index.html`처럼 폴더째 올리고, 관리 모드에서 카드를 추가하면 됩니다.

- `data/research.json`: KCI에서 ORCID `0000-0002-9766-9952`가 붙은 논문 33편(발행 연월 포함).
- `data/profile.json`: 소개 글과 연구 관심은 논문 주제를 보고 쓴 **초안**입니다. 꼭 고쳐 주세요.

## 4. 파일 구조

```
index.html  apps.html  research.html  admin.html
assets/css/style.css        공통 디자인
assets/css/admin.css        관리 페이지 디자인
assets/js/common.js         데이터 읽기, 앱 썸네일 그림, 서지 표기
assets/js/admin-inline.js   관리 모드 (GitHub API, 관리 버튼을 누를 때만 불러옴)
assets/img/                 관리 페이지에서 올린 이미지
data/*.json                 사이트 내용 (관리 페이지가 고치는 파일)
scripts/kci.py              KCI 서지 정보 추출 (Python 표준 라이브러리만 사용)
.github/workflows/          배포, KCI 가져오기 자동화
```

내 컴퓨터에서 미리 보기: 이 폴더에서 `python3 -m http.server` 실행 후 `http://localhost:8000`.

명령어로 KCI 정보 확인: `python3 scripts/kci.py show <KCI 주소>`
