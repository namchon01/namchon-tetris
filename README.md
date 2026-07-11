# namchon-tetris

iOS 연습용 모바일 테트리스 앱 + **Windows/브라우저용 웹 버전** + **아이폰 홈 화면 웹앱**

## GitHub Pages 배포 (온라인 주소로 실행)

`web/` 폴더를 GitHub Actions로 자동 배포합니다.

### 1회 설정

1. 이 PR을 `main`에 머지합니다.
2. 저장소 **Settings → Pages** 로 이동합니다.
3. **Build and deployment → Source** 에서 **GitHub Actions** 를 선택합니다.
4. **Actions** 탭에서 `Deploy GitHub Pages` 워크플로가 성공했는지 확인합니다.
   - 안 돌았으면 Actions에서 해당 워크플로 → **Run workflow** 로 수동 실행합니다.

배포가 끝나면 아래 주소로 접속할 수 있습니다.

```
https://namchon01.github.io/namchon-tetris/
```

아이폰 Safari에서 위 주소를 연 뒤, **공유 → 홈 화면에 추가** 하면 앱처럼 실행됩니다.

## 웹 버전 실행 (Windows, Mac, 아이폰, 아이패드)

Mac 없이 브라우저에서 바로 플레이할 수 있습니다.

### 방법 1: Python (Windows에 기본 포함되는 경우 많음)

```bash
cd namchon-tetris
python -m http.server 8080 --directory web
```

브라우저에서 **http://localhost:8080** 을 엽니다.

### 방법 2: Node.js

```bash
npx serve web
```

터미널에 표시되는 주소(예: http://localhost:3000)로 접속합니다.

---

## 아이폰에서 웹앱으로 실행

같은 Wi-Fi에 연결된 PC/Mac에서 서버를 켠 뒤, 아이폰 Safari로 접속합니다.

### 1) PC에서 서버 실행

```bash
cd namchon-tetris
python -m http.server 8080 --directory web --bind 0.0.0.0
```

PC의 로컬 IP를 확인합니다 (예: `192.168.0.23`).

- Windows: `ipconfig`
- Mac: 시스템 설정 → 네트워크, 또는 `ipconfig getifaddr en0`

### 2) 아이폰 Safari에서 열기

Safari 주소창에 아래를 입력합니다.

```
http://<PC의-IP>:8080
```

예: `http://192.168.0.23:8080`

### 3) 홈 화면에 추가 (앱처럼 실행)

1. Safari 하단 **공유** 버튼 탭
2. **홈 화면에 추가** 선택
3. 이름 확인 후 **추가**
4. 홈 화면의 **Tetris** 아이콘으로 실행 (Safari 주소창 없는 전체 화면)

> 같은 Wi-Fi가 아니거나 방화벽이 막혀 있으면 아이폰에서 접속되지 않을 수 있습니다.

### 조작법

| 입력 | 동작 |
|------|------|
| ◀ ▶ ↻ ↓ DROP 버튼 | 이동, 회전, 드롭 (좌/우/아래는 길게 누르면 연속) |
| 방향키 | 이동, 회전, 소프트 드롭 |
| 스페이스바 | 하드 드롭 |
| P | 일시정지 |
| Z / X / ↑ | 회전 |

---

## iOS 앱 실행 (Mac + Xcode 필요)

1. Mac에서 `NamchonTetris/NamchonTetris.xcodeproj`를 Xcode로 엽니다.
2. iPhone 시뮬레이터 또는 실제 기기를 선택합니다.
3. Run (⌘R)으로 실행합니다.

## 기능

- 10×20 게임 보드
- 7종 테트로미노 (이동, 회전, 소프트/하드 드롭)
- 라인 클리어, 점수, 레벨
- 다음 블록 미리보기
- 일시정지 / 재시작 / 게임 오버
- 세로모드(Portrait) UI
- 아이폰 홈 화면 추가(PWA) / 오프라인 캐시

## 프로젝트 구조

```
namchon-tetris/
├── .github/workflows/  ← GitHub Pages 자동 배포
├── web/                ← 브라우저·아이폰 웹앱
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── icons/
│   ├── css/
│   └── js/
└── NamchonTetris/      ← iOS 앱 (Mac + Xcode)
```

## 요구 사항

- **웹 / 아이폰 웹앱**: 최신 Chrome, Edge, Safari, Firefox / iOS Safari
- **iOS 네이티브**: iOS 17+, Xcode 15+
