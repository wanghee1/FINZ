# 수지하우스 (SuziHouse) Mobile

세금 환급 자격 판정 및 2주택자 6Way 세금 비교 시뮬레이션을 제공하는 모바일 앱입니다.

## 주요 기능

### Track 1 — 청년 소득세 감면 경정청구
- 소득세 감면 대상 판정 (세법상 나이, 중소기업, 군복무 공제)
- 세액공제 재조정 반영 환급 예상액 자동 계산
- 연도별 상세 내역 (원래 신고 vs 감면 적용 재계산)
- 수수료 안내 및 세무법인 인계 기능
- 단계별 입력 UI (인트로 → 기본정보 → 군복무 → 소득입력 → 결과)

### Track 2 — 2주택자 6Way 세금 비교
- A/B 두 주택 정보 입력 → 서버 6Way 계산
- 6가지 시나리오 (양도/증여/부담부증여 × A/B 주택)
- 비중과/중과 비교 및 최적 시나리오 추천
- AI 의견 요약, 결과 저장/공유/PDF 내보내기
- 단계별 흐름 (인트로 → 주택정보 → 결과)

### 공통 기능
- 인증 (회원가입/로그인) / 온보딩
- 홈 대시보드
- 생애주기 세금 가이드
- 세무사 상담 (목록 / 채팅)
- 마이페이지 (프로필, 시뮬레이션 저장, 알림 설정, 계정 관리)
- B2B / 기업 소개 페이지

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | React Native (Expo SDK 54) |
| Language | TypeScript |
| Navigation | React Navigation v7 (Native Stack + Bottom Tabs) |
| State | React Context + AsyncStorage |
| Backend | FastAPI (Python) — 별도 레포 |
| PDF/공유 | expo-print, expo-sharing |
| Icons | Expo Vector Icons (Ionicons) |
| Styling | StyleSheet (React Native) |

## 프로젝트 구조

```
src/
├── components/        # 공통 UI 컴포넌트
├── config/            # API 설정, 세무 설정
├── constants/         # 상수 정의
├── context/           # AuthContext (인증 상태 관리)
├── navigation/        # 네비게이션 설정
├── screens/           # 화면 컴포넌트
│   ├── track1/        # 청년 소득세 감면 단계별 화면
│   └── track2/        # 6Way 세금 비교 단계별 화면
├── services/          # API 클라이언트, 인증, 로컬 저장
├── styles/            # 공통 스타일
├── utils/             # 계산 로직, 포매터, PDF/공유 유틸
├── constants.ts       # 전역 상수
├── theme.ts           # 테마 (색상, 타이포그래피)
└── types.ts           # TypeScript 타입 정의
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm
- Expo CLI (`npx expo`)
- iOS: Expo Go 앱 (App Store)
- Android: Expo Go 앱 (Play Store) 또는 에뮬레이터

### 설치 및 실행

```bash
cd suzi_Mobile

# 의존성 설치
npm install

# 개발 서버 시작 (모바일 기기에서 접속할 수 있도록 --host 옵션 사용)
npx expo start --host tunnel
```

### 백엔드 서버 실행 (별도 터미널)

```bash
cd suzihouse-backend

# 가상환경 활성화 후
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 네트워크 설정 참고

- 프론트엔드는 Expo가 감지한 개발 서버 IP를 자동으로 백엔드 URL에 사용합니다 (`expo-constants`)
- iOS ATS(App Transport Security)는 HTTP 허용으로 설정되어 있습니다 (`app.json`)
- 백엔드 서버는 반드시 `--host 0.0.0.0`으로 실행해야 외부 기기에서 접근 가능합니다
- PC와 모바일 기기가 같은 Wi-Fi 네트워크에 있어야 합니다
- 방화벽에서 포트 8000을 허용해야 합니다

## 코드 컨벤션

- 쌍따옴표(`"`) 사용, 세미콜론 필수, Tab 들여쓰기
- 함수/변수: camelCase, 상수: UPPER_SNAKE_CASE
- 줄 길이 120자 이내
- 에러 메시지: 한/영 혼용, 구체적 원인 명시
- Prettier 설정: `.prettierrc` 참조

## 브랜치 전략

```
main (production)
└── develop (개발 통합)
      ├── feature/*      # 기능 개발
      ├── fix/*          # 버그 수정
      ├── hotfix/*       # 긴급 수정
      └── config/*       # 설정 변경
```

## 라이선스

Private — All rights reserved.
