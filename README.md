# namchon-tetris

iOS 연습용 모바일 테트리스 앱 + **Windows/브라우저용 웹 버전**

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

### 조작법

| 입력 | 동작 |
|------|------|
| ◀ ▶ ↻ ↓ DROP 버튼 | 이동, 회전, 드롭 |
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
- **5레벨 시스템**: 레벨마다 2000점 달성 시 다음 레벨
- 레벨업 시 낙하 속도 **10% 증가**
- 게임 오버 시 **이전 레벨**부터 재시작
- 회전/좌우 이동 중에도 낙하 타이머 유지
- 다음 블록 미리보기, 일시정지 / 재시작
- 세로모드(Portrait) UI

## 프로젝트 구조

```
namchon-tetris/
├── web/              ← 브라우저용 (Windows에서 실행)
│   ├── index.html
│   ├── css/
│   └── js/
└── NamchonTetris/    ← iOS 앱 (Mac + Xcode)
```

## 요구 사항

- **웹**: 최신 Chrome, Edge, Safari, Firefox
- **iOS**: iOS 17+, Xcode 15+
