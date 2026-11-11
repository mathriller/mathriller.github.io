# 최인용 · 서울교육대학교 수학교육과 홈페이지

수업용 앱 소개와 연구 목록을 담은 개인 홈페이지입니다. GitHub Pages로 무료로 운영되고,
`admin.html`(관리 페이지)에서 앱, 연구, 프로필을 브라우저로 바로 고칠 수 있습니다.

| 페이지 | 파일 | 내용 |
|---|---|---|
| 소개 | `index.html` | 이름, 소개 글, 대표 앱 3개, 최근 연구 5편, 연구 관심 |
| 수업용 앱 | `apps.html` | 앱 카드 목록. 영역(2022 개정 교육과정 4개 영역)과 대상별 필터 |
| 연구 | `research.html` | 연도별 논문 목록, 검색, 키워드 필터, 초록 펼치기 |
| 관리 | `admin.html` | 앱 추가·수정·순서 변경, KCI 주소로 논문 추가, 프로필 수정 |

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

## 2. 관리 페이지 쓰기

`https://아이디.github.io/admin.html`에 들어가면 처음에 GitHub 토큰을 물어봅니다.
토큰은 그 브라우저에만 저장되므로 기기마다 한 번씩 넣으면 됩니다. 관리 화면 아래의 ‘토큰 만드는 방법’에도 같은 안내가 있습니다.

**토큰 만들기**
1. [새 Fine-grained 토큰 만들기](https://github.com/settings/personal-access-tokens/new)를 엽니다.
2. Repository access → **Only select repositories** → 홈페이지 저장소 하나만 고릅니다.
3. Repository permissions에서 **Contents**와 **Actions**를 각각 **Read and write**로 바꿉니다.
4. Generate token을 누르고, 나온 문자열을 관리 페이지에 붙여 넣습니다.

### 앱 추가
‘새 앱 추가’를 누르고 이름, 주소, 한 줄 소개를 적습니다.
- **영역**을 고르면, 대표 이미지가 없을 때 영역에 맞는 그림(분수 막대, 그래프, 정다각형, 막대그래프)이 자동으로 들어갑니다.
- 화면 캡처를 올리면 자동으로 줄여서 저장합니다.
- ‘첫 화면에 표시’를 체크한 앱이 소개 페이지에 나옵니다. 체크한 앱이 없으면 목록 맨 위 3개가 나옵니다.
- 처음 들어 있는 4개는 **예시**입니다. ‘예시 앱 모두 지우기’로 한 번에 지울 수 있습니다.

### KCI 논문 추가
연구 탭에 KCI 논문 상세 페이지 주소를 붙여 넣고 ‘가져오기’를 누릅니다. 여러 편은 줄을 바꿔 넣습니다.
제목(국문·영문), 저자와 소속, 교신저자, 학술지, 권·호·쪽, DOI, 키워드, 초록을 정리해서 목록에 넣습니다.
보통 30초~1분 걸리고, 사이트에는 1~2분 뒤에 반영됩니다.

- 브라우저에서는 보안 정책(CORS) 때문에 KCI 페이지를 직접 읽을 수 없습니다. 그래서 GitHub 서버에서
  `scripts/kci.py`가 KCI 페이지를 읽어 `data/research.json`에 저장하도록 했습니다(`.github/workflows/kci.yml`).
- 같은 논문을 다시 넣으면 KCI의 최신 정보로 갱신합니다. 숨김 설정은 그대로 유지됩니다.
- 국외 학술지, 학술발표, 저서처럼 KCI에 없는 것은 ‘직접 입력’으로 넣습니다.

## 3. 지금 들어 있는 데이터

- `data/research.json`: KCI에서 ORCID `0000-0002-9766-9952`가 붙은 논문 33편을 이 스크립트로 가져온 것입니다.
  2014년 *Mathematics Education Research and Practice* 논문도 같은 ORCID라 포함했습니다. 빠진 것이 있으면 KCI 주소로 추가하면 됩니다.
- `data/profile.json`: 소개 글과 연구 관심은 논문 주제를 보고 쓴 **초안**입니다. 관리 페이지 ‘프로필’에서 꼭 고쳐 주세요.
  이메일, 연구실, 학력, 경력, 사진은 비워 두었습니다.
- `data/apps.json`: 예시 앱 4개(주소 없음).

## 4. 파일 구조

```
index.html  apps.html  research.html  admin.html
assets/css/style.css        공통 디자인
assets/css/admin.css        관리 페이지 디자인
assets/js/common.js         데이터 읽기, 앱 썸네일 그림, 서지 표기
assets/js/admin.js          관리 기능 (GitHub API)
assets/img/                 관리 페이지에서 올린 이미지
data/*.json                 사이트 내용 (관리 페이지가 고치는 파일)
scripts/kci.py              KCI 서지 정보 추출 (Python 표준 라이브러리만 사용)
.github/workflows/          배포, KCI 가져오기 자동화
```

내 컴퓨터에서 미리 보기: 이 폴더에서 `python3 -m http.server` 실행 후 `http://localhost:8000`.

명령어로 KCI 정보 확인: `python3 scripts/kci.py show <KCI 주소>`
