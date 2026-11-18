# 🎃 호박마켓 (Hobak Market) - 스타벅스 에디션

따뜻하고 세련된 스타벅스 무드의 우리 동네 중고거래 웹 애플리케이션입니다.  
Supabase BaaS(Backend-as-a-Service)와 연동되어 실시간 인증, 상품 CRUD, 매너온도 및 판매 상태 관리를 지원합니다.

---

## 🌟 주요 기능 (Key Features)

1. **중고거래 상품 탐색 및 필터링 (`list.html`)**
   - 카테고리별(여성의류, 디지털기기, 가구/인테리어 등) 필터링
   - 키워드 실시간 검색 및 인기 검색어 칩
   - 최신순 / 인기순(관심순) / 낮은 가격순 / 높은 가격순 정렬
   - **거래 완료만 보기 필터**: 거래완료된 매물만 모아보는 옵션 지원
   - **상태별 뱃지 & 흐림 처리**: `판매중`, `예약중`, `거래완료` 뱃지 및 거래 완료 시 시각적인 디밍(Dimmed) 효과

2. **상품 상세 정보 (`detail.html`)**
   - 상품 상세 이미지, 가격, 상세 설명, 통계(관심, 채팅수, 조회수)
   - 판매자 프로필 및 매너온도 게이지 시스템
   - **내 게시글 관리 패널**: 본인이 작성한 게시글 조회 시 [수정하기], [삭제하기], [판매중 / 예약중 / 거래완료] 상태 전환 버튼 활성화

3. **게시글 등록 및 수정 (`write.html`)**
   - 이미지 URL 첨부 및 다중 이미지 관리
   - 가격, 나눔 여부, 가격 제안 받기, 카테고리, 상세 설명 입력
   - 기존 게시글 수정 모드 지원 (`?edit={id}`)

4. **수파베이스(Supabase) 인증 & 데이터베이스 연동 (`shared/data.js`)**
   - 이메일/비밀번호 기반 회원가입 및 로그인 모달
   - 회원가입 시 닉네임 필수 입력 및 프로필 테이블(`profiles`) 자동 동기화
   - 로그인 여부에 따른 헤더 전환 (로그인 전: `[로그인]` / 로그인 후: `[닉네임] [로그아웃]`)
   - 미로그인 상태에서 글쓰기 클릭 시 로그인 유도 후 자동 이동

---

## 📁 프로젝트 구조 (Project Structure)

```text
hobak/
├── index.html              # 메인 진입점 (list.html로 자동 리디렉트)
├── list.html               # 상품 목록 및 필터링 페이지
├── list.js                 # 목록 로직 및 필터/정렬 제어
├── list.css                # 목록 전용 스타일
├── detail.html             # 상품 상세 페이지
├── detail.js               # 상세 페이지 로직 (판매자 전용 관리 포함)
├── detail.css              # 상세 전용 스타일
├── write.html              # 상품 등록 및 수정 페이지
├── write.js                # 상품 등록/수정 폼 핸들러
├── write.css               # 등록 폼 스타일
├── shared/
│   ├── common.css          # 디자인 시스템 (스타벅스 시그니처 팔레트, 공통 컴포넌트)
│   └── data.js             # Supabase Client, Auth, DB API 및 로컬 캐시 관리
├── .env.example            # 환경 변수 설정 템플릿
├── .gitignore              # Git 제외 파일 설정
└── README.md               # 프로젝트 안내 문서
```

---

## 🚀 배포 및 로컬 실행 방법 (Deployment & Run)

### 1. 로컬 실행
정적 웹 서버(Live Server, Python http.server, Nginx 등)를 통해 바로 실행할 수 있습니다:
```bash
# Python 내장 서버 예시
python -m http.server 8080
```
브라우저에서 `http://localhost:8080` 접속 시 `list.html`로 자동 연결됩니다.

### 2. GitHub Pages 배포
1. 저장소 Settings -> Pages로 이동합니다.
2. Build and deployment의 Source를 `Deploy from a branch`로 선택합니다.
3. Branch를 `main` (또는 `master`), 폴더를 `/(root)`로 지정하고 Save를 누릅니다.
4. 모든 링크가 상대 경로로 구성되어 있어 하위 디렉터리 경로에서도 정상 작동합니다.

### 3. Vercel / Netlify 배포
별도의 빌드 과정(No-build) 없이 저장소를 연동하여 바로 배포할 수 있습니다.

---

## 🔒 보안 및 개인정보 보호 (Security Notice)
- 본 프로젝트는 클라이언트 사이드에서 **공개 가능한 Anon Public Key**만을 사용하여 Supabase와 통신합니다.
- 관리자 권한을 가진 **`SERVICE_ROLE_KEY`는 절대로 클라이언트 코드나 GitHub 저장소에 노출되지 않도록 철저히 격리**되어 있습니다.
- 개인 식별 정보(이메일, 휴대폰 번호, 실명 등)는 외부에 직접 노출되지 않고 닉네임 기반으로 안전하게 표시됩니다.
