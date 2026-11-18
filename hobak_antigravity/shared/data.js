// ============================================================
// 호박마켓 (Hobak Market) - Supabase & Data Management Layer
// ============================================================

// 1. Supabase 연동 설정 (Anon 키 사용, PII 배제)
const SUPABASE_CONFIG = {
  url: "https://bvnfbnyewutlsodwoqrd.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bmZibnlld3V0bHNvZHdvcXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MzQ3MzAsImV4cCI6MjExMDQxMDczMH0.OaeDUU2aauLxdkccdfQsQzlG14vD3q9LBWkvvUBaf0Y"
};

let _supabaseClient = null;

function getSupabaseClient() {
  if (!_supabaseClient && typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function") {
    _supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
  return _supabaseClient;
}

// ============================================================
// 2. 인증(Auth) 관리 모듈 (Supabase Auth 연동)
// ============================================================
const AUTH_STORAGE_KEY = "hobak_auth_user";

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  updateHeaderAuthUI();
}

async function signUpUser(email, password, nickname) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase 클라이언트가 로드되지 않았습니다.");

  if (!nickname || !nickname.trim()) {
    throw new Error("닉네임을 반드시 입력해주세요.");
  }

  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password: password,
    options: {
      data: {
        nickname: nickname.trim()
      }
    }
  });

  if (error) {
    throw error;
  }

  if (data && data.user) {
    // profiles 테이블에 익명 프로필 등록/업데이트
    try {
      await client.from("profiles").upsert({
        id: data.user.id,
        nickname: nickname.trim(),
        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        location_name: "충남 아산시 온양읍 화정동",
        manner_temp: 36.5,
        response_rate: "100%"
      });
    } catch (e) {
      console.warn("Profile upsert warning:", e);
    }

    const userObj = {
      id: data.user.id,
      email: data.user.email,
      nickname: nickname.trim()
    };
    setCurrentUser(userObj);
    return { success: true, user: userObj, session: data.session };
  }
  throw new Error("회원가입에 실패했습니다.");
}

async function signInUser(email, password) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase 클라이언트가 로드되지 않았습니다.");

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) {
    throw error;
  }

  if (data && data.user) {
    let nickname = data.user.user_metadata?.nickname;
    try {
      const { data: prof } = await client
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

      if (prof && prof.nickname) {
        nickname = prof.nickname;
      } else {
        if (!nickname) nickname = data.user.email.split("@")[0];
        await client.from("profiles").upsert({
          id: data.user.id,
          nickname: nickname,
          avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          location_name: "충남 아산시 온양읍 화정동",
          manner_temp: 36.5,
          response_rate: "100%"
        });
      }
    } catch (err) {
      console.warn("Profile fetch warning:", err);
      if (!nickname) nickname = data.user.email.split("@")[0];
    }

    const userObj = {
      id: data.user.id,
      email: data.user.email,
      nickname: nickname || "호박이"
    };
    setCurrentUser(userObj);
    return { success: true, user: userObj };
  }
  throw new Error("로그인에 실패했습니다.");
}

async function signOutUser() {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn("Sign out error:", e);
    }
  }
  setCurrentUser(null);
}

// 상단 우측 인증 상태에 따른 버튼 UI 전환
function updateHeaderAuthUI() {
  const user = getCurrentUser();
  const loginBtns = document.querySelectorAll("#headerLoginBtn, .btn-header-login");
  const userBoxes = document.querySelectorAll("#headerUserBox, .user-logged-box");
  const nickTexts = document.querySelectorAll("#headerNicknameText, .user-nickname-text");

  if (user && user.nickname) {
    loginBtns.forEach(btn => btn.style.display = "none");
    userBoxes.forEach(box => box.style.display = "inline-flex");
    nickTexts.forEach(el => el.textContent = user.nickname);
  } else {
    loginBtns.forEach(btn => btn.style.display = "inline-flex");
    userBoxes.forEach(box => box.style.display = "none");
  }
}

// ============================================================
// 3. Auth 모달 UI 동적 생성 및 제어 (HobakAuthUI)
// ============================================================
const HobakAuthUI = {
  currentMode: "login", // 'login' | 'signup'
  onSuccessCallback: null,

  ensureModal() {
    let modal = document.getElementById("authModal");
    if (modal) return modal;

    const modalHtml = `
      <div class="auth-modal-overlay" id="authModal" style="display:none;">
        <div class="auth-modal-card">
          <div class="auth-modal-header">
            <div class="auth-header-logo">
              <span class="auth-logo-badge">🎃</span>
              <h3 class="auth-modal-title" id="authModalTitle">호박마켓 로그인</h3>
            </div>
            <button type="button" class="btn-auth-close" id="closeAuthModalBtn" aria-label="닫기">&times;</button>
          </div>

          <div class="auth-tabs">
            <button type="button" class="auth-tab active" id="tabLogin">로그인</button>
            <button type="button" class="auth-tab" id="tabSignup">회원가입</button>
          </div>

          <div class="auth-modal-body">
            <div class="auth-guide-banner" id="authGuideBanner" style="display:none;">
              <i class="fa-solid fa-circle-info"></i>
              <span id="authGuideText">로그인이 필요한 서비스입니다.</span>
            </div>

            <form id="authForm" autocomplete="off" onsubmit="return false;">
              <div class="auth-input-group" id="signupNicknameGroup" style="display:none;">
                <label for="authNickname" class="auth-label">닉네임 <span class="required-star">*</span></label>
                <div class="auth-input-wrap">
                  <i class="fa-solid fa-user auth-icon"></i>
                  <input type="text" id="authNickname" placeholder="호박마켓에서 사용할 닉네임 (필수)" maxlength="20">
                </div>
              </div>

              <div class="auth-input-group">
                <label for="authEmail" class="auth-label">이메일 주소 <span class="required-star">*</span></label>
                <div class="auth-input-wrap">
                  <i class="fa-solid fa-envelope auth-icon"></i>
                  <input type="email" id="authEmail" placeholder="example@email.com" required>
                </div>
              </div>

              <div class="auth-input-group">
                <label for="authPassword" class="auth-label">비밀번호 <span class="required-star">*</span></label>
                <div class="auth-input-wrap">
                  <i class="fa-solid fa-lock auth-icon"></i>
                  <input type="password" id="authPassword" placeholder="6자리 이상 비밀번호" required minlength="6">
                </div>
              </div>

              <div class="auth-error-msg" id="authErrorMsg" style="display:none;"></div>

              <button type="submit" class="btn-auth-submit" id="btnAuthSubmit">
                <span id="btnAuthSubmitText">로그인하기</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    modal = document.getElementById("authModal");
    this.bindEvents(modal);
    return modal;
  },

  bindEvents(modal) {
    const closeBtn = document.getElementById("closeAuthModalBtn");
    const tabLogin = document.getElementById("tabLogin");
    const tabSignup = document.getElementById("tabSignup");
    const authForm = document.getElementById("authForm");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.close();
    });

    if (tabLogin) {
      tabLogin.addEventListener("click", () => this.switchMode("login"));
    }
    if (tabSignup) {
      tabSignup.addEventListener("click", () => this.switchMode("signup"));
    }

    if (authForm) {
      authForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
  },

  switchMode(mode) {
    this.currentMode = mode;
    const tabLogin = document.getElementById("tabLogin");
    const tabSignup = document.getElementById("tabSignup");
    const nickGroup = document.getElementById("signupNicknameGroup");
    const submitText = document.getElementById("btnAuthSubmitText");
    const title = document.getElementById("authModalTitle");
    const errorMsg = document.getElementById("authErrorMsg");

    if (errorMsg) errorMsg.style.display = "none";

    if (mode === "signup") {
      if (tabLogin) tabLogin.classList.remove("active");
      if (tabSignup) tabSignup.classList.add("active");
      if (nickGroup) nickGroup.style.display = "block";
      if (submitText) submitText.textContent = "가입하고 시작하기";
      if (title) title.textContent = "호박마켓 회원가입";
    } else {
      if (tabSignup) tabSignup.classList.remove("active");
      if (tabLogin) tabLogin.classList.add("active");
      if (nickGroup) nickGroup.style.display = "none";
      if (submitText) submitText.textContent = "로그인하기";
      if (title) title.textContent = "호박마켓 로그인";
    }
  },

  open(mode = "login", guideText = "", onSuccess = null) {
    const modal = this.ensureModal();
    this.onSuccessCallback = onSuccess;

    const guideBanner = document.getElementById("authGuideBanner");
    const guideSpan = document.getElementById("authGuideText");
    const errorMsg = document.getElementById("authErrorMsg");

    if (errorMsg) errorMsg.style.display = "none";

    if (guideText) {
      if (guideBanner) guideBanner.style.display = "flex";
      if (guideSpan) guideSpan.textContent = guideText;
    } else {
      if (guideBanner) guideBanner.style.display = "none";
    }

    this.switchMode(mode);
    modal.style.display = "flex";

    const emailInput = document.getElementById("authEmail");
    if (emailInput) setTimeout(() => emailInput.focus(), 60);
  },

  close() {
    const modal = document.getElementById("authModal");
    if (modal) modal.style.display = "none";
  },

  async handleSubmit() {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const nickname = document.getElementById("authNickname") ? document.getElementById("authNickname").value.trim() : "";
    const submitBtn = document.getElementById("btnAuthSubmit");

    if (!email) {
      this.showError("이메일을 입력해주세요.");
      return;
    }
    if (!password || password.length < 6) {
      this.showError("비밀번호는 6자리 이상이어야 합니다.");
      return;
    }
    if (this.currentMode === "signup" && !nickname) {
      this.showError("회원가입을 위해 닉네임을 반드시 입력해주세요.");
      return;
    }

    try {
      submitBtn.disabled = true;

      if (this.currentMode === "signup") {
        await signUpUser(email, password, nickname);
        if (typeof showToast === "function") {
          showToast(`🎉 환영합니다, ${nickname}님! 회원가입이 완료되었습니다.`);
        }
      } else {
        const res = await signInUser(email, password);
        if (typeof showToast === "function") {
          showToast(`👋 어서오세요, ${res.user.nickname}님! 로그인되었습니다.`);
        }
      }

      this.close();
      updateHeaderAuthUI();

      if (typeof this.onSuccessCallback === "function") {
        this.onSuccessCallback();
      }
    } catch (err) {
      console.error("Auth submit error:", err);
      let msg = err.message || "오류가 발생했습니다.";
      if (msg.includes("Invalid login credentials")) {
        msg = "이메일 또는 비밀번호가 올바르지 않습니다.";
      } else if (msg.includes("User already registered")) {
        msg = "이미 등록된 이메일 주소입니다. 로그인 탭을 이용해주세요.";
      }
      this.showError(msg);
    } finally {
      submitBtn.disabled = false;
    }
  },

  showError(msg) {
    const errorMsg = document.getElementById("authErrorMsg");
    if (errorMsg) {
      errorMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${msg}</span>`;
      errorMsg.style.display = "flex";
    }
  }
};

// ============================================================
// 4. 초기 오프라인 가상 데이터 10개 (Fallback 및 캐시용)
// ============================================================
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    title: "무이음 야상 자켓 (상태 극상)",
    price: 50000,
    priceFormatted: "50,000원",
    isFree: false,
    category: "여성의류",
    location: "충남 아산시 온양읍 화정동",
    timeAgo: "9일 전",
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80",
    seller: {
      id: "user_2222",
      nickname: "2222",
      location: "온양읍, 화정동",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      temperature: 36.8,
      responseRate: "100%"
    },
    description: `집에 야상자켓이 너무 많아서 팔아요 ㅠㅠ\n작년 겨울에 진.짜 딱 한번만 입었어요.\n색도 이쁘고 오버핏이라 핏도 너무 예뻐요!\n얼른 구매하세용~ 직거래는 온양읍 화정동 근처에서 가능합니다.`,
    status: "판매중",
    likes: 14,
    chats: 5,
    views: 182
  },
  {
    id: 2,
    title: "빈티지 오버핏 케이블 브이넥 니트",
    price: 32000,
    priceFormatted: "32,000원",
    isFree: false,
    category: "여성의류",
    location: "서울 강남구 역삼동",
    timeAgo: "2시간 전",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80",
    seller: {
      id: "user_vintage",
      nickname: "빈티지홀릭",
      location: "역삼1동",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      temperature: 38.2,
      responseRate: "95%"
    },
    description: `가을/겨울에 따뜻하게 입기 좋은 케이블 브이넥 니트입니다.\n짜임 탄탄하고 보풀 거의 없어요. 오버핏이라 남녀공용으로 입으셔도 좋아요!`,
    status: "판매중",
    likes: 23,
    chats: 8,
    views: 310
  },
  {
    id: 3,
    title: "소니 노이즈캔슬링 무선 헤드폰 WH-1000XM4 블랙",
    price: 185000,
    priceFormatted: "185,000원",
    isFree: false,
    category: "디지털기기",
    location: "서울 서초구 서초동",
    timeAgo: "5시간 전",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    seller: {
      id: "user_sound",
      nickname: "사운드러버",
      location: "서초2동",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
      temperature: 41.5,
      responseRate: "98%"
    },
    description: `풀박스 보관중이고 실사용 6개월 정도입니다.\n노이즈캔슬링 기능 정상 작동하고 외관 기스 없이 깨끗합니다.\n케이스 및 충전 케이블 함께 드립니다.`,
    status: "예약중",
    likes: 45,
    chats: 12,
    views: 520
  },
  {
    id: 4,
    title: "감성 캠핑 우드 롤테이블 (보관가방 포함)",
    price: 45000,
    priceFormatted: "45,000원",
    isFree: false,
    category: "스포츠/레저",
    location: "경기 성남시 분당구 정자동",
    timeAgo: "1일 전",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
    seller: {
      id: "user_camper",
      nickname: "캠핑조아",
      location: "정자1동",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80",
      temperature: 37.0,
      responseRate: "90%"
    },
    description: `캠핑 입문할 때 구매해서 3회 사용했습니다.\n너도밤나무 원목이라 단단하고 감성 넘칩니다.\n사이즈 90x60cm 입니다. 승용차 트렁크에 쏙 들어갑니다.`,
    status: "판매중",
    likes: 8,
    chats: 3,
    views: 140
  },
  {
    id: 5,
    title: "스타벅스 홀리데이 리본 한정판 보온 텀블러 473ml (미사용)",
    price: 28000,
    priceFormatted: "28,000원",
    isFree: false,
    category: "여성잡화",
    location: "서울 마포구 연남동",
    timeAgo: "3시간 전",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
    seller: {
      id: "user_pumpkin",
      nickname: "별다방러버",
      location: "연남동",
      avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=80",
      temperature: 42.0,
      responseRate: "100%"
    },
    description: `선물 받고 박스 채 보관만 한 스타벅스 홀리데이 레드 리본 한정판 텀블러입니다.\n기스 전혀 없고 보온/보냉 성능 탁월해요. 쇼핑백과 텀블러 쿠폰도 함께 드립니다!`,
    status: "판매중",
    likes: 31,
    chats: 15,
    views: 405
  },
  {
    id: 6,
    title: "레트로 원형 카본 전기히터 난로",
    price: 25000,
    priceFormatted: "25,000원",
    isFree: false,
    category: "생활가전",
    location: "서울 관악구 봉천동",
    timeAgo: "6시간 전",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?auto=format&fit=crop&w=800&q=80",
    seller: {
      id: "user_retro",
      nickname: "따스한온기",
      location: "봉천동",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
      temperature: 36.5,
      responseRate: "89%"
    },
    description: `올 겨울 따뜻하게 보낼 수 있는 레트로 감성 원형 난로입니다.\n켜자마자 바로 따뜻해지고 회전 기능 잘 됩니다.\n깨끗이 닦아두었습니다.`,
    status: "판매중",
    likes: 12,
    chats: 4,
    views: 210
  },
  {
    id: 7,
    title: "나이키 에어포스 1 '07 로우 올백 (260mm)",
    price: 75000,
    priceFormatted: "75,000원",
    isFree: false,
    category: "남성패션/잡화",
    location: "서울 영등포구 여의도동",
    timeAgo: "1일 전",
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
    seller: {
      id: "user_sneaker",
      nickname: "스니커즈매니아",
      location: "여의도동",
      avatar: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=200&q=80",
      temperature: 39.1,
      responseRate: "97%"
    },
    description: `나이키 공홈 정품입니다. 사이즈 미스로 3회 단시간 착용 후 보관했습니다.\n앞코 주름 약간 외에는 밑창 마모 거의 없는 민트급입니다. 박스 포함입니다.`,
    status: "판매중",
    likes: 19,
    chats: 7,
    views: 380
  },
  {
    id: 8,
    title: "마뗑킴 시그니처 미니 체인백 실버",
    price: 48000,
    priceFormatted: "48,000원",
    isFree: false,
    category: "여성잡화",
    location: "서울 성동구 성수동",
    timeAgo: "2일 전",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    seller: {
      id: "user_fashion",
      nickname: "성수동쇼퍼",
      location: "성수1가",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
      temperature: 37.5,
      responseRate: "94%"
    },
    description: `포인트 주기에 너무 좋은 실버 미니 체인백입니다.\n금속 버클에 미세 스크래치 조금 있는 것 감안해서 가격 낮춰 올려요.\n가볍고 은근히 수납 잘 됩니다!`,
    status: "판매중",
    likes: 27,
    chats: 9,
    views: 460
  },
  {
    id: 9,
    title: "애플 아이패드 에어 5세대 M1 64GB WiFi 스타라이트",
    price: 520000,
    priceFormatted: "520,000원",
    isFree: false,
    category: "디지털기기",
    location: "서울 용산구 한남동",
    timeAgo: "4일 전",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80",
    seller: {
      id: "user_apple",
      nickname: "애플생태계",
      location: "한남동",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      temperature: 45.2,
      responseRate: "100%"
    },
    description: `구매 직후 강화유리 및 마그네틱 케이스 장착하여 찍힘이나 스크래치 전혀 없습니다.\n배터리 효율 96%, 구성품 모두 있습니다.\n직거래 한남역 인근 선호합니다.`,
    status: "판매완료",
    likes: 58,
    chats: 19,
    views: 890
  },
  {
    id: 10,
    title: "보겔 원목 감성 흔들의자 & 풋스툴",
    price: 68000,
    priceFormatted: "68,000원",
    isFree: false,
    category: "가구/인테리어",
    location: "서울 마포구 합정동",
    timeAgo: "5일 전",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1580481077195-c328ad4f4453?auto=format&fit=crop&w=800&q=80",
    seller: {
      id: "user_home",
      nickname: "홈스위트홈",
      location: "합정동",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      temperature: 36.8,
      responseRate: "92%"
    },
    description: `거실에서 책 읽거나 휴식 취할 때 쓰기 너무 편안한 원목 흔들의자입니다.\n풋스툴까지 세트 구성이며 쿠션 세탁 완료해두었습니다.\n부피가 있어 차량으로 직접 픽업 오셔야 합니다.`,
    status: "판매중",
    likes: 16,
    chats: 6,
    views: 310
  }
];

const STORAGE_KEY = "hobak_products_starbucks_v2";

// 5. 시간 포맷 헬퍼 함수
function formatTimeAgo(dateInput) {
  if (!dateInput) return "방금 전";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "방금 전";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "방금 전";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}달 전`;
  return `${Math.floor(diffMonth / 12)}년 전`;
}

// 6. DB 레코드 -> UI 객체 변환 포맷터
function formatProduct(p) {
  let images = [];
  if (p.product_images && Array.isArray(p.product_images) && p.product_images.length > 0) {
    images = p.product_images
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(img => img.image_url);
  }

  const primaryImage = images.length > 0
    ? images[0]
    : "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80";

  const seller = p.profiles ? {
    id: p.profiles.id,
    nickname: p.profiles.nickname || "호박이",
    location: p.profiles.location_name || p.location,
    avatar: p.profiles.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    temperature: Number(p.profiles.manner_temp || 36.5),
    responseRate: p.profiles.response_rate || "100%"
  } : {
    id: "anonymous",
    nickname: "호박이",
    location: p.location,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    temperature: 36.5,
    responseRate: "100%"
  };

  return {
    id: p.id,
    title: p.title,
    price: p.price,
    priceFormatted: p.is_free || p.price === 0 ? "나눔🧡" : `${Number(p.price).toLocaleString()}원`,
    isFree: p.is_free,
    allowSuggest: p.allow_suggest,
    category: p.category,
    location: p.location,
    timeAgo: formatTimeAgo(p.created_at),
    createdAt: p.created_at,
    image: primaryImage,
    images: images.length > 0 ? images : [primaryImage],
    seller: seller,
    description: p.description,
    status: p.status || "판매중",
    likes: p.likes || 0,
    chats: p.chats || 0,
    views: p.views || 0
  };
}

// 7. 로컬 스토리지 동기식 접근 함수 (초기 로딩 및 오프라인 보장)
function getProducts() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse stored products:", e);
    return DEFAULT_PRODUCTS;
  }
}

function getProductById(id) {
  const products = getProducts();
  return products.find(p => String(p.id) === String(id));
}

function saveProductLocal(product) {
  const products = getProducts();
  const newProduct = {
    ...product,
    id: product.id || Date.now(),
    createdAt: new Date().toISOString(),
    timeAgo: "방금 전",
    likes: product.likes || 0,
    chats: product.chats || 0,
    views: product.views || 1,
    status: product.status || "판매중"
  };
  products.unshift(newProduct);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  return newProduct;
}

function updateProductLocal(id, updatedFields) {
  const products = getProducts();
  const index = products.findIndex(p => String(p.id) === String(id));
  if (index !== -1) {
    products[index] = { ...products[index], ...updatedFields };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return products[index];
  }
  return null;
}

// 8. Supabase 비동기 통신 함수
async function fetchProducts() {
  const client = getSupabaseClient();
  if (!client) {
    return getProducts();
  }
  try {
    const { data, error } = await client
      .from("products")
      .select(`
        *,
        profiles!seller_id (*),
        product_images (*)
      `)
      .order("id", { ascending: false });

    if (error) {
      console.warn("Supabase fetchProducts error:", error);
      return getProducts();
    }

    if (data && data.length > 0) {
      const formatted = data.map(formatProduct);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
      return formatted;
    }
    return getProducts();
  } catch (err) {
    console.warn("Failed to fetch products from Supabase:", err);
    return getProducts();
  }
}

async function fetchProductById(id) {
  const client = getSupabaseClient();
  if (!client) {
    return getProductById(id);
  }
  try {
    const { data, error } = await client
      .from("products")
      .select(`
        *,
        profiles!seller_id (*),
        product_images (*)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return getProductById(id);
    }

    const formatted = formatProduct(data);
    updateProductLocal(formatted.id, formatted);
    return formatted;
  } catch (err) {
    return getProductById(id);
  }
}

async function saveProduct(productData) {
  const localSaved = saveProductLocal(productData);
  const client = getSupabaseClient();
  if (!client) {
    return localSaved;
  }

  try {
    const currentUser = getCurrentUser();
    let sellerId = currentUser ? currentUser.id : null;
    let nickname = (currentUser && currentUser.nickname) || (productData.seller && productData.seller.nickname) || "호박이";
    let loc = (productData.seller && productData.seller.location) || productData.location || "충남 아산시 온양읍 화정동";

    // 1. 프로필 등록/보정 (로그인된 사용자 우선)
    if (sellerId) {
      try {
        await client.from("profiles").upsert({
          id: sellerId,
          nickname: nickname,
          avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          location_name: loc,
          manner_temp: 36.5,
          response_rate: "100%"
        });
      } catch (e) {
        console.warn("Profile sync in saveProduct warning:", e);
      }
    } else {
      // 비로그인 익명 작성 시 가상 프로필 생성
      const { data: profileData } = await client
        .from("profiles")
        .insert({
          nickname: nickname,
          avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
          location_name: loc,
          manner_temp: 36.5,
          response_rate: "100%"
        })
        .select("id")
        .single();

      if (profileData) sellerId = profileData.id;
    }

    // 2. products 등록
    const { data: newProd, error: prodErr } = await client
      .from("products")
      .insert({
        seller_id: sellerId,
        title: productData.title,
        category: productData.category,
        price: productData.price || 0,
        is_free: !!productData.isFree,
        allow_suggest: productData.allowSuggest !== false,
        location: productData.location,
        description: productData.description || "",
        status: "판매중",
        views: 1,
        likes: 0,
        chats: 0
      })
      .select()
      .single();

    if (prodErr || !newProd) {
      console.warn("Product insert warning:", prodErr);
      return localSaved;
    }

    // 3. product_images 등록
    const imagesToSave = productData.images && productData.images.length > 0 
      ? productData.images 
      : [productData.image || "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80"];

    const imgInserts = imagesToSave.map((url, idx) => ({
      product_id: newProd.id,
      image_url: url,
      is_primary: idx === 0,
      sort_order: idx
    }));

    await client.from("product_images").insert(imgInserts);

    // ID 동기화
    localSaved.id = newProd.id;
    if (localSaved.seller) {
      localSaved.seller.id = sellerId;
      localSaved.seller.nickname = nickname;
    }
    updateProductLocal(localSaved.id, localSaved);

    return localSaved;
  } catch (err) {
    console.error("Supabase saveProduct error:", err);
    return localSaved;
  }
}

async function updateProduct(id, updatedFields) {
  const localRes = updateProductLocal(id, updatedFields);
  const client = getSupabaseClient();
  if (!client) return localRes;

  try {
    const dbFields = {};
    if ("views" in updatedFields) dbFields.views = updatedFields.views;
    if ("likes" in updatedFields) dbFields.likes = updatedFields.likes;
    if ("status" in updatedFields) dbFields.status = updatedFields.status;

    if (Object.keys(dbFields).length > 0) {
      await client.from("products").update(dbFields).eq("id", id);
    }
  } catch (err) {
    console.warn("Supabase updateProduct warning:", err);
  }
  return localRes;
}

async function sendChatMessage(productId, message, sellerId) {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const currentUser = getCurrentUser();
    let buyerId = currentUser ? currentUser.id : null;

    if (!buyerId) {
      const { data: bProfile } = await client
        .from("profiles")
        .insert({
          nickname: "구매희망자",
          location_name: "동네 이웃",
          manner_temp: 36.5
        })
        .select("id")
        .single();
      if (bProfile) buyerId = bProfile.id;
    }

    const { data: room } = await client
      .from("chat_rooms")
      .insert({
        product_id: productId,
        buyer_id: buyerId || sellerId,
        seller_id: sellerId,
        last_message: message,
        last_message_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (room) {
      await client.from("chat_messages").insert({
        room_id: room.id,
        sender_id: buyerId || sellerId,
        message: message,
        is_system: false
      });
      return true;
    }
  } catch (err) {
    console.warn("sendChatMessage warning:", err);
  }
  return false;
}

async function submitReport(productId, reason) {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const user = getCurrentUser();
    await client.from("reports").insert({
      product_id: productId,
      reporter_id: user ? user.id : null,
      reason: reason,
      status: "접수"
    });
    return true;
  } catch (err) {
    console.warn("submitReport warning:", err);
  }
  return false;
}

// ============================================================
// 9. 전역 이벤트 및 자동 초기화
// ============================================================
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    // 1) 상단 우측 인증 버튼 상태 반영
    updateHeaderAuthUI();

    // 2) 로그인 버튼 클릭 이벤트
    const loginBtns = document.querySelectorAll("#headerLoginBtn, .btn-header-login");
    loginBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        HobakAuthUI.open("login");
      });
    });

    // 3) 로그아웃 버튼 클릭 이벤트
    const logoutBtns = document.querySelectorAll("#headerLogoutBtn, .btn-header-logout");
    logoutBtns.forEach(btn => {
      btn.addEventListener("click", async () => {
        await signOutUser();
        if (typeof showToast === "function") {
          showToast("안전하게 로그아웃되었습니다.");
        }
        if (window.location.pathname.includes("write.html")) {
          window.location.href = "list.html";
        }
      });
    });

    // 4) 글쓰기 버튼 클릭 가로채기 (비로그인 상태 시 모달 안내 및 성공 시 이동)
    const writeLinks = document.querySelectorAll("#headerWriteBtn, .btn-write-header, .fab-write");
    writeLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        const user = getCurrentUser();
        if (!user) {
          e.preventDefault();
          HobakAuthUI.open("login", "글을 등록하려면 로그인이 필요합니다.", () => {
            window.location.href = "write.html";
          });
        }
      });
    });
  });
}

// 10. 글로벌 스코프 노출
if (typeof window !== "undefined") {
  window.HobakDB = {
    DEFAULT_PRODUCTS,
    getProducts,
    getProductById,
    saveProduct,
    saveProductLocal,
    updateProduct,
    fetchProducts,
    fetchProductById,
    sendChatMessage,
    submitReport,
    getSupabaseClient,
    getCurrentUser,
    signUpUser,
    signInUser,
    signOutUser,
    updateHeaderAuthUI,
    HobakAuthUI
  };
  window.HobakAuthUI = HobakAuthUI;
}
