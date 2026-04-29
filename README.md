Resume this session with:
claude --resume f3699875-4269-4344-a8cd-7a4fb192c94f

# 수지하우스 (SuziHouse)

세무 시뮬레이션 모바일 앱 — 청년 소득세 환급(Track 1)과 2주택자 6Way 세금 비교(Track 2)

```
SuziHouseMobile/
├── suzihouse-backend/    # FastAPI 백엔드 (Python)
├── suzi_Mobile/          # React Native 프론트엔드 (Expo)
├── .github/workflows/    # CI/CD (보안 테스트, 정적 분석)
└── docs/                 # 기획 문서
```

---

## 빠른 시작

### 1. 백엔드 — 로컬 개발 (SQLite)

```bash
cd suzihouse-backend

# 가상환경 생성 & 활성화
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일에서 아래 항목 수정:
#   SECRET_KEY, JWT_SECRET_KEY → python -c "import secrets; print(secrets.token_urlsafe(64))" 로 생성
#   DATABASE_URL=sqlite+aiosqlite:///./suzihouse_dev.db

# DB 마이그레이션
alembic upgrade head

# 서버 실행
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

서버 실행 후:

- API 서버: http://localhost:8000
- Swagger 문서: http://localhost:8000/docs
- ReDoc 문서: http://localhost:8000/redoc

> SQLite를 사용하면 MySQL, Redis 없이 로컬 개발이 가능합니다.

### 2. CODEF API 설정 (Track 1 간편인증)

Track 1 청년 소득세 환급 기능은 CODEF API를 통해 홈택스 근로소득 지급명세서를 자동 조회합니다.

```bash
# .env 파일에 CODEF 키 설정
CODEF_CLIENT_ID=<CODEF에서 발급받은 Client ID>
CODEF_CLIENT_SECRET=<CODEF에서 발급받은 Client Secret>
CODEF_PUBLIC_KEY=<CODEF RSA 공개키>
CODEF_BASE_URL=https://development.codef.io    # 데모: development / 운영: api
```

CODEF 키가 없으면 간편인증 기능이 비활성화되며, 수동 입력 모드로만 사용 가능합니다.

**CODEF 간편인증 2WAY 플로우:**

```
[사용자] 인증수단 선택 (카카오/PASS/토스 등)
    ↓
[백엔드] CODEF 1차 요청 → CF-03002 응답 (2WAY 정보)
    ↓
[사용자] 인증 앱에서 인증 완료
    ↓
[프론트] 3초 간격 자동 폴링 → [백엔드] CODEF 2차 요청
    ↓
[백엔드] 인증 완료 → 지급명세서 데이터 수신
    ↓
[백엔드] 연도별 추가 조회 → 적격성 판정 → 환급 계산
```

지원 인증 수단: 카카오톡, PASS(통신사), 토스, 네이버, 삼성패스, KB모바일, 신한, 뱅크샐러드, NH, 우리

### 3. 백엔드 — Docker (운영 환경)

```bash
cd suzihouse-backend

# 1) Docker 시크릿 파일 생성 (최초 1회)
mkdir -p secrets
python -c "import secrets; print(secrets.token_urlsafe(32))" > secrets/db_password.txt
python -c "import secrets; print(secrets.token_urlsafe(32))" > secrets/db_root_password.txt
python -c "import secrets; print(secrets.token_urlsafe(64))" > secrets/jwt_secret.txt

# 2) .env 파일 설정
cp .env.example .env
# DATABASE_URL, REDIS_URL 등 운영 값 설정
# REDIS_PASSWORD 필수 설정 (미설정 시 컨테이너 시작 실패)
# CODEF 키 설정 (Track 1 간편인증)

# 3) 컨테이너 실행
docker compose up -d --build
```

Docker Compose 구성:

| 서비스          | 설명                         | 보안                                                     |
| --------------- | ---------------------------- | -------------------------------------------------------- |
| `app`           | FastAPI (uvicorn, 4 workers) | read-only 파일시스템, non-root 사용자                    |
| `mysql`         | MySQL 8.0                    | TLS 강제, Docker secrets 인증                            |
| `redis`         | Redis 7 (Alpine)             | 비밀번호 필수, 위험 명령어 차단 (FLUSHALL/FLUSHDB/DEBUG) |
| `celery-worker` | Celery 비동기 워커           | read-only, secrets 마운트                                |

시크릿은 `secrets/*.txt` 파일로 관리되며 **절대 git에 커밋하지 마세요** (`secrets/`는 `.gitignore`에 포함).

### 4. 프론트엔드 실행

```bash
cd suzi_Mobile

# 의존성 설치
npm install

# Expo 개발 서버
npx expo start

# 특정 플랫폼:
npx expo start --web
npx expo start --android
npx expo start --ios
```

### 5. 테스트

```bash
cd suzihouse-backend

# 보안 테스트 (57개)
python -m pytest tests/security/ -v

# 계산 엔진 단위 테스트 (41개)
python -m pytest tests/test_track1_engine/ tests/test_track2_engine/ -v

# 전체 테스트
python -m pytest tests/ -v

# 통합 테스트 (서버 실행 상태에서)
python tests/test_integration.py
```

---

## 환경변수 (.env)

```env
# === 필수 ===
APP_ENV=development                # development | staging | production
DEBUG=true                         # production에서는 반드시 false
SECRET_KEY=<최소 32자, python -c "import secrets; print(secrets.token_urlsafe(64))" 로 생성>
JWT_SECRET_KEY=<최소 32자, SECRET_KEY와 다른 값>
JWT_REFRESH_SECRET_KEY=<별도 생성 필수 (production에서 미설정 시 서버 시작 실패)>

# === DB (택 1) ===
DATABASE_URL=sqlite+aiosqlite:///./suzihouse_dev.db    # 로컬 개발
# DATABASE_URL=mysql+aiomysql://user:pass@host/db      # 운영

# === CORS (production 필수) ===
# CORS_ORIGINS=["https://app.suzihouse.com"]           # production은 명시적 설정 필수

# === Redis ===
REDIS_URL=redis://localhost:6379/0
# REDIS_PASSWORD=<Docker Compose 사용 시 필수>

# === CODEF API (Track 1 간편인증 — 없으면 수동 입력만 가능) ===
CODEF_CLIENT_ID=<CODEF Client ID>
CODEF_CLIENT_SECRET=<CODEF Client Secret>
CODEF_PUBLIC_KEY=<CODEF RSA 공개키 (민감정보 암호화용)>
CODEF_BASE_URL=https://development.codef.io    # 데모: development / 운영: api

# === 기타 외부 API (없으면 해당 기능 비활성화) ===
MOLIT_API_KEY=
OPENAI_API_KEY=

# === Rate Limiting ===
RATE_LIMIT_ANON=100                # 비인증 요청/분
RATE_LIMIT_AUTH=300                # 인증 요청/분
```

> **Production 시작 시 자동 검증**: `APP_ENV=production`이면 서버 시작 시 SECRET_KEY 길이, JWT 키 분리, CORS 설정, DEBUG=false를 자동 검증합니다. 미충족 시 서버가 시작되지 않습니다.

---

## 백엔드 구조

```
suzihouse-backend/
├── app/
│   ├── main.py                  # FastAPI 엔트리포인트
│   ├── config.py                # 환경 설정 (Docker secrets 지원)
│   │
│   ├── core/                    # 핵심 인프라
│   │   ├── database.py          # SQLAlchemy 엔진, 세션
│   │   ├── security.py          # JWT (access/refresh 분리), bcrypt
│   │   ├── deps.py              # FastAPI 의존성 (get_current_user)
│   │   ├── middleware.py        # CORS, HTTPS, Rate Limit, CSP, 요청 로깅, 크기 제한
│   │   ├── exceptions.py        # 커스텀 예외 + 핸들러
│   │   ├── rbac.py              # 역할 기반 접근 제어
│   │   ├── account_lock.py      # 계정 잠금 (Redis + 인메모리 폴백, fail-closed)
│   │   ├── audit.py             # 감사 로그
│   │   └── redis.py             # Redis 클라이언트
│   │
│   ├── models/                  # SQLAlchemy ORM 모델 (21개 테이블)
│   │   ├── user.py              # 사용자 (birth_year CHECK, phone UNIQUE)
│   │   ├── auth.py              # 리프레시 토큰 (복합 인덱스)
│   │   ├── track1.py            # Track1 인증/수집/계산/결과/소득연도 (FK 제약, 2WAY 필드)
│   │   ├── track2.py            # Track2 시뮬레이션/입력/결과 (복합 인덱스)
│   │   ├── handoff.py           # 세무법인 인계 (FK 제약)
│   │   ├── notification.py      # 알림 설정 (user+type UNIQUE)
│   │   ├── lifecycle.py         # 정책 버전, 조정대상지역 (region_code UNIQUE)
│   │   ├── audit.py             # 감사 로그 (복합 인덱스)
│   │   └── consent.py           # 동의 이력 (개인정보보호법)
│   │
│   ├── schemas/                 # Pydantic 요청/응답 스키마
│   │   ├── codef.py             # CODEF 간편인증 요청/응답 (2WAY)
│   │   ├── track1.py            # Track1 계산 결과/이력
│   │   └── ...
│   │
│   ├── routers/                 # API 엔드포인트
│   ├── services/                # 비즈니스 로직
│   │   ├── auth_service.py      # 인증/토큰/탈퇴 시 동의 철회
│   │   ├── track1_service.py    # CODEF 간편인증 + 지급명세서 수집 + 환급 계산 파이프라인
│   │   ├── consent_service.py   # 동의 관리 (기록/조회/확인)
│   │   ├── data_retention.py    # 데이터 보존 정책 (30일 퍼지, 5년 감사로그)
│   │   └── ...
│   │
│   ├── engines/                 # 세무 계산 엔진 (순수 로직)
│   │   ├── track1/              # 청년 소득세 감면 계산
│   │   └── track2/              # 6Way 양도/증여/취득세 비교
│   │
│   ├── external/                # 외부 API 연동
│   │   ├── codef_client.py      # CODEF API 클라이언트 (간편인증 2WAY, 지급명세서 조회)
│   │   ├── codef_token_manager.py # CODEF OAuth 토큰 관리 (발급/캐싱/갱신)
│   │   ├── codef_crypto.py      # CODEF RSA 암호화 (PKCS1v15)
│   │   ├── codef_parser.py      # CODEF 응답 파서 (지급명세서/고용정보)
│   │   ├── molit_client.py      # 국토부 실거래가
│   │   └── openai_client.py     # GPT AI 의견
│   │
│   └── utils/
│       └── crypto.py            # AES-256-GCM 암호화 (HKDF 키 파생), HMAC-SHA256 해시
│
├── tests/
│   ├── security/                # 보안 테스트 (57개)
│   │   ├── test_crypto.py       # PII 암복호화, 변조 탐지
│   │   ├── test_jwt_security.py # 토큰 분리, 타입 검증
│   │   ├── test_config_security.py   # 필수 설정 검증
│   │   ├── test_password_validation.py # 비밀번호 정책
│   │   ├── test_model_constraints.py  # DB 제약 조건
│   │   └── test_middleware_security.py # 민감 필드 마스킹
│   ├── test_track1_engine/      # Track1 계산 단위 테스트
│   ├── test_track2_engine/      # Track2 계산 단위 테스트
│   └── test_integration.py      # API 통합 테스트
│
├── alembic/                     # DB 마이그레이션
├── config/                      # 세율/정책 JSON 데이터
├── secrets/                     # Docker 시크릿 (gitignore)
├── requirements.txt
├── Dockerfile                   # 멀티스테이지 빌드
└── docker-compose.yml           # 운영 환경 (MySQL + Redis + secrets)
```

---

## 프론트엔드 구조

```
suzi_Mobile/
├── App.tsx                      # 앱 루트 (ErrorBoundary + AuthProvider + Navigation)
├── src/
│   ├── config/
│   │   └── api.config.ts        # API URL (운영 HTTPS 강제)
│   ├── context/
│   │   └── AuthContext.tsx       # 인증 상태 관리 (안전한 로그아웃)
│   ├── services/
│   │   ├── apiClient.ts         # fetch 래퍼 (JWT 자동 첨부, 토큰 갱신 뮤텍스, 응답 크기 제한)
│   │   ├── authService.ts       # 인증 (전체 필드 타입가드, 토큰 만료 검증)
│   │   ├── simulationStorage.ts # Track2 로컬 저장 (스키마 검증, 크기 제한)
│   │   ├── track1Service.ts     # Track1 CODEF 간편인증/데이터수집/결과조회/세무사인계
│   │   └── track2Service.ts
│   ├── components/
│   │   ├── ErrorBoundary.tsx     # 앱 크래시 복구 UI
│   │   └── ...
│   ├── screens/
│   │   ├── Track1YouthTaxScreen.tsx  # Track1 메인 (간편인증 2WAY 폴링 + 계산)
│   │   ├── track1/
│   │   │   ├── Track1IntroStep.tsx
│   │   │   ├── Track1BasicInfoStep.tsx
│   │   │   ├── Track1MilitaryStep.tsx
│   │   │   ├── Track1IncomeHelpers.tsx  # 인증수단 선택 UI, 카운트다운, 소득 입력
│   │   │   └── Track1ResultStep.tsx
│   │   └── track2/              # Track2 6Way 세금 비교
│   ├── types.ts                 # 공통 타입 (AuthStatus, AuthProviderId 등)
│   └── utils/
├── app.json                     # Expo 설정 (불필요 권한 차단, ATS 보안 기본 적용)
└── package.json
```

---

## API 엔드포인트

### 인증 (`/auth`)

| Method | Path            | Auth   | 설명                                |
| ------ | --------------- | ------ | ----------------------------------- |
| POST   | `/auth/signup`  | -      | 회원가입 (비밀번호 복잡도 검증)     |
| POST   | `/auth/login`   | -      | 로그인 (JWT access + refresh 발급)  |
| POST   | `/auth/refresh` | -      | 토큰 갱신                           |
| POST   | `/auth/logout`  | Bearer | 로그아웃                            |
| DELETE | `/auth/account` | Bearer | 회원 탈퇴 (동의 철회 + 소프트 삭제) |

### Track 1 — 청년 소득세 환급 (`/api/task1`)

| Method | Path                        | Auth   | 설명                         |
| ------ | --------------------------- | ------ | ---------------------------- |
| POST   | `/api/task1/auth/start`     | Bearer | 간편인증 시작 (CODEF 2WAY)   |
| POST   | `/api/task1/auth/confirm`   | Bearer | 간편인증 확인 (3초 폴링)     |
| POST   | `/api/task1/tax-data`       | Bearer | 세금 데이터 수집 + 환급 계산 |
| GET    | `/api/task1/refund/result`  | Bearer | 최신 환급 계산 결과          |
| GET    | `/api/task1/refund/history` | Bearer | 계산 이력 (페이지네이션)     |
| POST   | `/api/task1/handoffs`       | Bearer | 세무사 연결 요청             |
| GET    | `/api/task1/handoffs/{id}`  | Bearer | 연결 요청 상태 조회          |

### Track 2 — 2주택자 6Way 세금 비교 (`/api/task2`)

| Method | Path                                     | Auth   | 설명            |
| ------ | ---------------------------------------- | ------ | --------------- |
| POST   | `/api/task2/simulations`                 | Bearer | 시뮬레이션 생성 |
| GET    | `/api/task2/simulations`                 | Bearer | 목록 조회       |
| GET    | `/api/task2/simulations/{id}`            | Bearer | 상세 조회       |
| PATCH  | `/api/task2/simulations/{id}/inputs`     | Bearer | 입력 저장       |
| POST   | `/api/task2/simulations/{id}/calculate`  | Bearer | 6Way 계산       |
| GET    | `/api/task2/simulations/{id}/result`     | Bearer | 결과 조회       |
| POST   | `/api/task2/simulations/{id}/ai-summary` | Bearer | AI 의견         |
| DELETE | `/api/task2/simulations/{id}`            | Bearer | 삭제            |
| GET    | `/api/task2/realtrade`                   | Bearer | 실거래가 조회   |
| GET    | `/api/task2/policy`                      | -      | 정책 버전       |

### 기타

| Method | Path                      | Auth   | 설명            |
| ------ | ------------------------- | ------ | --------------- |
| GET    | `/health`                 | -      | 서버 상태       |
| GET    | `/api/users/me`           | Bearer | 내 프로필       |
| PATCH  | `/api/users/me`           | Bearer | 프로필 수정     |
| GET    | `/api/lifecycle/services` | Bearer | 생애주기 서비스 |

---

## Track 1 간편인증 플로우

Track 1은 CODEF API와 연동하여 홈택스 근로소득 지급명세서를 자동 조회합니다.

### 사용자 플로우

1. **기본 정보 입력** — 생년월일, 성별, 최초 중소기업 취업일
2. **병역 정보 입력** — 복무 기간 (세액감면 나이 차감에 반영)
3. **소득 자료 입력** — 자동(간편인증) 또는 수동 선택
   - **자동 모드**: 간편인증 → 지급명세서 자동 수집 → 환급 계산
   - **수동 모드**: 원천징수영수증 항목 직접 입력 → 로컬 계산
4. **결과 확인** — 연도별 환급 상세, PDF 저장, 세무사 인계

### 자동 모드 상세

```
인증수단 선택 → 이름/휴대폰 입력 → [인증 시작]
    ↓
인증 앱에서 인증 완료 대기 (최대 4분 30초, 카운트다운 표시)
    ↓
인증 완료 → [데이터 수집] 버튼 → 5개년 지급명세서 자동 조회
    ↓
적격성 판정 + 다년도 환급 계산 → 결과 화면
```

### 백엔드 파이프라인

1. `start_auth()` — CODEF 1차 요청, 2WAY 정보 DB 저장
2. `confirm_auth()` — 3초 폴링, CODEF 2차 요청으로 인증 완료 확인
3. `request_tax_data()` — 연도별 지급명세서 조회 (세션 재사용)
4. `_process_tax_data()` — 파싱 → IncomeYear 저장 → 적격성 판정 → 환급 계산

---

## 기술 스택

### 백엔드

| 구분         | 기술                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| Framework    | FastAPI 0.110+                                                           |
| ORM          | SQLAlchemy 2.0 (async)                                                   |
| DB           | SQLite (개발) / MySQL 8.0 (운영, TLS 강제)                               |
| Cache        | Redis 7 (비밀번호 인증, 위험 명령어 차단)                                |
| Auth         | JWT (access/refresh 비밀키 분리, HMAC 키 파생) + bcrypt                  |
| Crypto       | AES-256-GCM (HKDF 키 파생) + HMAC-SHA256 (조회 해시)                     |
| External API | CODEF (간편인증 + 지급명세서), 국토부 MOLIT (실거래가), OpenAI (AI 의견) |
| Validation   | Pydantic v2 (비밀번호 10자+, 사전 차단, 반복 패턴 차단)                  |
| Task Queue   | Celery + Redis                                                           |
| Migration    | Alembic (batch mode, SQLite 호환)                                        |
| Container    | Docker 멀티스테이지 빌드, Docker secrets, 동시연결/요청 제한             |
| CI/CD        | GitHub Actions (pytest, bandit, pip-audit, npm audit)                    |

### 프론트엔드

| 구분       | 기술                                                                      |
| ---------- | ------------------------------------------------------------------------- |
| Framework  | React Native 0.81 + Expo 54                                               |
| Language   | TypeScript 5.9                                                            |
| Navigation | React Navigation 7                                                        |
| State      | Context API + SecureStore / AsyncStorage                                  |
| Charts     | react-native-chart-kit                                                    |
| 보안       | ErrorBoundary, JWT 만료 검증, 토큰 갱신 뮤텍스, 입력 검증, 응답 크기 제한 |

---

## 보안 (Secure by Design)

이 프로젝트는 **한국 시큐어코딩 가이드(2023년 개정본)** 및 **개인정보보호법** 기준으로 보안 감사를 수행하고, Secure by Design 원칙에 따라 보안을 내재화했습니다.

### 적용된 보안 조치

**인증 & 접근 제어**

- JWT access/refresh 토큰 비밀키 분리 (HMAC-SHA256 기반 키 파생, production 별도 키 필수)
- 비밀번호 복잡도 강화 (10자+, 대/소/숫자/특수문자, 일반 비밀번호 사전 차단, 반복 패턴 차단)
- 계정 잠금: Redis 기반 + 인메모리 폴백, Redis 장애 시 fail-closed (브루트포스 방지)
- 토큰 갱신 시 감사 로그 기록
- CODEF 민감정보 RSA 암호화 (PKCS1v15, CODEF 공개키)

**Production 안전장치**

- 서버 시작 시 설정 자동 검증 (SECRET_KEY 길이, JWT 키 분리, CORS 명시, DEBUG=false)
- CORS 와일드카드(`*`) 사용 시 production에서 서버 시작 거부
- SQL 쿼리 로깅(echo) production에서 자동 비활성화 (PII 노출 방지)
- Redis 비밀번호 미설정 시 컨테이너 시작 거부

**암호화 & 데이터 보호**

- AES-256-GCM 필드 레벨 PII 암호화 (HKDF 키 파생, NIST SP 800-56C 준수)
- HMAC-SHA256 조회용 해시
- DB 무결성: FK/UNIQUE/CHECK 제약, 복합 인덱스
- 동의 관리: ConsentLog 모델로 동의 이력 추적, 탈퇴 시 동의 철회
- 데이터 보존: 30일 계정 퍼지 (PII 익명화), 5년 감사로그 보존

**인프라 & 네트워크**

- Docker: secrets 관리, read-only 파일시스템, non-root 컨테이너
- Uvicorn: keep-alive 타임아웃, 동시 연결 제한, 최대 요청 수 제한
- 요청 크기 제한: 1MB (DoS 방지)
- 보안 헤더: HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Permissions-Policy
- 운영 환경 HTTPS 강제, MySQL TLS, Redis 인증 필수

**프론트엔드**

- 토큰 갱신 뮤텍스 (동시 401 레이스 컨디션 방지)
- 저장 사용자 데이터 전체 필드 타입가드 검증
- 클라이언트 측 입력 검증 (이메일 포맷, 비밀번호 강도, 출생연도 범위)
- 에러 메시지 새니타이즈 (서버 에러 직접 노출 방지, 코드 매핑)
- iOS ATS(App Transport Security) 기본 보안 적용 (HTTP 예외 제거)
- ErrorBoundary, 토큰 만료 자동 삭제, 응답 크기 제한, 불필요 권한 차단

**로깅 & 감사**

- 민감 필드 자동 마스킹 (password, token, api_key 등)
- 인증 관련 엔드포인트 쿼리 파라미터 전체 마스킹
- 토큰 갱신/로그인/로그아웃 감사 로그 DB 기록

**CI/CD 보안**

- GitHub Actions에서 시크릿 하드코딩 제거 (GitHub Secrets + 동적 run_id 사용)

---

## 테스트 현황

| 분류                  | 테스트 수 | 내용                                     |
| --------------------- | --------- | ---------------------------------------- |
| 보안 테스트           | 57개      | 암호화, JWT, 비밀번호, DB 제약, 미들웨어 |
| 계산 엔진 단위 테스트 | 41개      | Track1 + Track2 세금 계산 로직           |
| API 통합 테스트       | 22개      | 전체 엔드포인트 플로우                   |
| **합계**              | **120개** |                                          |

### CI/CD (GitHub Actions)

`push`/`PR` 시 자동 실행:

- `backend-security-tests` — pytest 보안 테스트
- `backend-static-analysis` — bandit 정적 분석
- `backend-dependency-audit` — pip-audit 취약점 스캔
- `frontend-audit` — npm audit 의존성 검사
