/**
 * 호박마켓 (Hobak Market) - 상품 상세 페이지 스크립트 (detail.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  initDetailPage();
});

let currentProduct = null;
let isLiked = false;

async function initDetailPage() {
  // 1. URL 쿼리 파라미터에서 id 추출 (?id=1)
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id") || "1";

  // 2. shared/data.js 의 HobakDB 에서 상품 정보 조회
  if (!window.HobakDB) {
    console.error("HobakDB not loaded from shared/data.js");
    return;
  }

  // 초기 캐시 데이터 즉시 렌더
  currentProduct = window.HobakDB.getProductById(productId) || window.HobakDB.getProductById(1);

  if (!currentProduct) {
    const all = window.HobakDB.getProducts();
    if (all && all.length > 0) {
      currentProduct = all[0];
    }
  }

  if (currentProduct) {
    // 3. 조회수 자동 증가 (sessionStorage 중복 방지)
    handleViewCount(currentProduct);

    // 4. 데이터 렌더링
    renderProductDetails(currentProduct);

    // 5. 찜(관심) 상태 초기화
    initLikeState(currentProduct);

    // 6. 연관 상품 추천 목록 렌더링
    renderRelatedProducts(currentProduct);
  }

  // 7. 이벤트 리스너 바인딩
  bindEventListeners();

  // 8. Supabase 비동기 최신 상세 정보 동기화
  if (typeof window.HobakDB.fetchProductById === "function") {
    try {
      const freshProduct = await window.HobakDB.fetchProductById(productId);
      if (freshProduct) {
        currentProduct = freshProduct;
        renderProductDetails(currentProduct);
        initLikeState(currentProduct);
        renderRelatedProducts(currentProduct);
      }
    } catch (err) {
      console.warn("Supabase fetchProductById warning:", err);
    }
  }
}

/**
 * 조회수 증가 처리
 */
function handleViewCount(product) {
  const viewedKey = `hobak_viewed_${product.id}`;
  if (!sessionStorage.getItem(viewedKey)) {
    const newViews = (product.views || 0) + 1;
    product.views = newViews;
    window.HobakDB.updateProduct(product.id, { views: newViews });
    sessionStorage.setItem(viewedKey, "true");
  }
}

/**
 * 상품 상세 데이터 화면 바인딩
 */
function renderProductDetails(product) {
  document.title = `${product.title} | 호박마켓`;

  // 대표 이미지
  const mainImg = document.getElementById("productMainImage");
  if (mainImg) {
    mainImg.src = product.image;
    mainImg.alt = product.title;
    mainImg.onerror = () => {
      mainImg.src = "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80";
    };
  }

  // 상품 상태 뱃지 오버레이
  const statusBadge = document.getElementById("statusOverlayBadge");
  const imgContainer = document.querySelector(".product-image-container");
  if (statusBadge) {
    statusBadge.className = "status-overlay-badge";
    if (product.status === "예약중") {
      statusBadge.classList.add("reserved");
      statusBadge.textContent = "예약중";
      statusBadge.style.display = "block";
      if (imgContainer) imgContainer.classList.remove("is-completed");
    } else if (product.status === "거래완료" || product.status === "판매완료") {
      statusBadge.classList.add("completed");
      statusBadge.textContent = "거래완료";
      statusBadge.style.display = "block";
      if (imgContainer) imgContainer.classList.add("is-completed");
    } else {
      statusBadge.classList.add("selling");
      statusBadge.textContent = "판매중";
      statusBadge.style.display = "none";
      if (imgContainer) imgContainer.classList.remove("is-completed");
    }
  }

  // 작성자 전용 관리 패널 렌더링
  checkAndRenderSellerControls(product);

  // 판매자 프로필 정보 (이미지2 디자인 그대로 반영)
  const sellerAvatar = document.getElementById("sellerAvatar");
  if (sellerAvatar) {
    sellerAvatar.src = (product.seller && product.seller.avatar) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";
    sellerAvatar.alt = (product.seller && product.seller.nickname) || "판매자";
  }

  const sellerNick = document.getElementById("sellerNickname");
  if (sellerNick) {
    sellerNick.textContent = (product.seller && product.seller.nickname) || "호박이";
  }

  const sellerLoc = document.getElementById("sellerLocation");
  if (sellerLoc) {
    sellerLoc.textContent = (product.seller && product.seller.location) || product.location || "온양읍, 화정동";
  }

  // 매너온도 계산 및 렌더링
  const temp = (product.seller && product.seller.temperature) || 36.5;
  const mannerTempNum = document.getElementById("mannerTempNum");
  if (mannerTempNum) {
    mannerTempNum.textContent = `${temp.toFixed(1)}°C`;
  }

  const mannerFaceIcon = document.getElementById("mannerFaceIcon");
  if (mannerFaceIcon) {
    if (temp >= 40.0) {
      mannerFaceIcon.textContent = "😊";
    } else if (temp >= 36.5) {
      mannerFaceIcon.textContent = "🙂";
    } else {
      mannerFaceIcon.textContent = "😐";
    }
  }

  const mannerGaugeBar = document.getElementById("mannerGaugeBar");
  if (mannerGaugeBar) {
    // 0~100도 기준 바 게이지 (최소 5% ~ 최대 100%)
    const percent = Math.min(100, Math.max(5, temp));
    mannerGaugeBar.style.width = `${percent}%`;
  }

  // 상품 제목
  const titleEl = document.getElementById("productTitle");
  if (titleEl) {
    titleEl.textContent = product.title;
  }

  // 카테고리 · 등록시간
  const metaEl = document.getElementById("productMeta");
  if (metaEl) {
    metaEl.textContent = `${product.category} · ${product.timeAgo || "방금 전"}`;
  }

  // 가격
  const priceEl = document.getElementById("productPrice");
  const priceFormatted = product.isFree || product.price === 0
    ? "나눔🧡"
    : `${Number(product.price).toLocaleString()}원`;

  if (priceEl) {
    priceEl.textContent = priceFormatted;
    if (product.isFree || product.price === 0) {
      priceEl.classList.add("free");
    }
  }

  // 하단 바 가격
  const bottomPriceEl = document.getElementById("bottomPriceNum");
  if (bottomPriceEl) {
    bottomPriceEl.textContent = priceFormatted;
  }

  // 상세 설명 (줄바꿈 보존)
  const descEl = document.getElementById("productDescription");
  if (descEl) {
    descEl.textContent = product.description || "등록된 상세 설명이 없습니다.";
  }

  // 통계 정보 (채팅, 관심, 조회)
  updateStatsDisplay(product);
}

/**
 * 통계 수치 표시 갱신
 */
function updateStatsDisplay(product) {
  const chatStat = document.getElementById("statChats");
  if (chatStat) chatStat.textContent = product.chats || 0;

  const likeStat = document.getElementById("statLikes");
  if (likeStat) likeStat.textContent = product.likes || 0;

  const viewStat = document.getElementById("statViews");
  if (viewStat) viewStat.textContent = product.views || 0;
}

/**
 * 작성자 전용 관리 패널 상태 확인 및 제어
 */
function checkAndRenderSellerControls(product) {
  const manageBox = document.getElementById("sellerManageBox");
  if (!manageBox) return;

  const currentUser = window.HobakDB ? window.HobakDB.getCurrentUser() : null;
  const isOwner = currentUser && (
    (currentUser.id && product.seller && String(currentUser.id) === String(product.seller.id)) ||
    (currentUser.nickname && product.seller && currentUser.nickname === product.seller.nickname)
  );

  if (isOwner) {
    manageBox.style.display = "block";

    // 판매 상태 탭 활성화 상태 동기화
    const currentStatus = product.status || "판매중";
    const statusButtons = manageBox.querySelectorAll(".btn-status-tab");
    statusButtons.forEach(btn => {
      const btnStatus = btn.dataset.status;
      const isMatch = btnStatus === currentStatus || (btnStatus === "거래완료" && currentStatus === "판매완료");
      btn.classList.toggle("active", isMatch);
    });

    // 하단바 우측 버튼을 "게시글 수정하기"로 전환
    const chatBtn = document.getElementById("btnChatAction");
    if (chatBtn) {
      chatBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
        <span>게시글 수정하기</span>
      `;
      chatBtn.classList.add("btn-seller-edit");
    }
  } else {
    manageBox.style.display = "none";
    const chatBtn = document.getElementById("btnChatAction");
    if (chatBtn && chatBtn.classList.contains("btn-seller-edit")) {
      chatBtn.classList.remove("btn-seller-edit");
      chatBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>채팅하기</span>
      `;
    }
  }
}

/**
 * 찜(관심) 버튼 상태 관리
 */
function initLikeState(product) {
  const likeStorageKey = `hobak_liked_${product.id}`;
  isLiked = localStorage.getItem(likeStorageKey) === "true";

  const likeBtn = document.getElementById("btnLikeToggle");
  if (likeBtn) {
    if (isLiked) {
      likeBtn.classList.add("active");
    } else {
      likeBtn.classList.remove("active");
    }
  }
}

/**
 * 찜 버튼 토글 액션
 */
function toggleLike() {
  if (!currentProduct) return;

  const likeBtn = document.getElementById("btnLikeToggle");
  const likeStorageKey = `hobak_liked_${currentProduct.id}`;

  isLiked = !isLiked;
  let currentLikes = currentProduct.likes || 0;

  if (isLiked) {
    currentLikes += 1;
    localStorage.setItem(likeStorageKey, "true");
    if (likeBtn) likeBtn.classList.add("active");
    showToast("🧡 관심 목록에 추가되었습니다.");
  } else {
    currentLikes = Math.max(0, currentLikes - 1);
    localStorage.removeItem(likeStorageKey);
    if (likeBtn) likeBtn.classList.remove("active");
    showToast("관심 목록에서 삭제되었습니다.");
  }

  currentProduct.likes = currentLikes;
  window.HobakDB.updateProduct(currentProduct.id, { likes: currentLikes });
  updateStatsDisplay(currentProduct);
}

/**
 * 연관 추천 상품 (이 판매자의 다른 상품 / 근처 추천 상품) 렌더링
 */
function renderRelatedProducts(product) {
  const container = document.getElementById("relatedProductsGrid");
  if (!container) return;

  const allProducts = window.HobakDB.getProducts() || [];
  // 현재 상품 제외하고 최대 4개 추출
  const related = allProducts
    .filter(p => String(p.id) !== String(product.id))
    .slice(0, 4);

  if (related.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #868E96; padding: 20px;">추천 상품이 없습니다.</div>`;
    return;
  }

  container.innerHTML = related.map(item => {
    const formattedPrice = item.isFree || item.price === 0
      ? "나눔🧡"
      : `${Number(item.price).toLocaleString()}원`;

    return `
      <a href="detail.html?id=${item.id}" class="related-card">
        <div class="related-card-thumb-wrap">
          <img src="${item.image}" alt="${item.title}" class="related-card-thumb" onerror="this.src='https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=400&q=80'" />
        </div>
        <div class="related-card-info">
          <div class="related-card-title">${escapeHtml(item.title)}</div>
          <div class="related-card-price">${formattedPrice}</div>
          <div class="related-card-meta">${item.location ? item.location.split(' ').slice(-1)[0] : '호박동'} · ${item.timeAgo || '방금 전'}</div>
        </div>
      </a>
    `;
  }).join("");
}

/**
 * 이벤트 리스너 바인딩
 */
function bindEventListeners() {
  // 1. 찜(하트) 버튼 클릭
  const likeBtn = document.getElementById("btnLikeToggle");
  if (likeBtn) {
    likeBtn.addEventListener("click", toggleLike);
  }

  // 2. 채팅하기 / 게시글 수정하기 버튼 클릭
  const chatBtn = document.getElementById("btnChatAction");
  if (chatBtn) {
    chatBtn.addEventListener("click", () => {
      if (chatBtn.classList.contains("btn-seller-edit")) {
        window.location.href = `write.html?edit=${currentProduct.id}`;
      } else {
        openChatModal();
      }
    });
  }

  // 2-1. 작성자 전용 수정 버튼 클릭
  const editBtn = document.getElementById("btnManageEdit");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      if (currentProduct) {
        window.location.href = `write.html?edit=${currentProduct.id}`;
      }
    });
  }

  // 2-2. 작성자 전용 삭제 버튼 클릭
  const deleteBtn = document.getElementById("btnManageDelete");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!currentProduct) return;
      if (confirm("정말 이 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.")) {
        await window.HobakDB.deleteProduct(currentProduct.id);
        alert("게시글이 성공적으로 삭제되었습니다.");
        window.location.href = "list.html";
      }
    });
  }

  // 2-3. 판매 상태 변경 탭 버튼들 클릭
  document.querySelectorAll("#statusChoiceButtons .btn-status-tab").forEach(btn => {
    btn.addEventListener("click", async () => {
      const newStatus = btn.dataset.status;
      if (!currentProduct || currentProduct.status === newStatus) return;

      currentProduct.status = newStatus;
      await window.HobakDB.updateProduct(currentProduct.id, { status: newStatus });

      renderProductDetails(currentProduct);
      checkAndRenderSellerControls(currentProduct);

      if (typeof showToast === "function") {
        showToast(`🎉 거래 상태가 '${newStatus}'(으)로 변경되었습니다!`);
      }
    });
  });

  // 3. 공유하기 버튼 클릭
  const shareBtn = document.getElementById("btnShare");
  if (shareBtn) {
    shareBtn.addEventListener("click", handleShare);
  }

  // 4. 신고하기 버튼 클릭
  const reportBtn = document.getElementById("btnReportPost");
  if (reportBtn) {
    reportBtn.addEventListener("click", openReportModal);
  }

  const moreOptionBtn = document.getElementById("btnMoreOption");
  if (moreOptionBtn) {
    moreOptionBtn.addEventListener("click", openReportModal);
  }

  // 5. 이미지 줌 버튼 클릭
  const zoomBtn = document.getElementById("btnZoomImage");
  if (zoomBtn) {
    zoomBtn.addEventListener("click", openZoomModal);
  }

  // 6. 모달 닫기 버튼들
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const modal = e.target.closest(".hobak-modal-backdrop");
      if (modal) modal.classList.remove("active");
    });
  });

  // 백드롭 클릭 시 모달 닫기
  document.querySelectorAll(".hobak-modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove("active");
      }
    });
  });

  // 7. 채팅 빠른 응답 칩 클릭
  document.querySelectorAll(".btn-quick-reply").forEach(chip => {
    chip.addEventListener("click", () => {
      const input = document.getElementById("chatMessageInput");
      if (input) {
        input.value = chip.textContent;
        sendChatMessage();
      }
    });
  });

  // 8. 채팅 전송 버튼 & 엔터키
  const sendBtn = document.getElementById("btnSendChat");
  const chatInput = document.getElementById("chatMessageInput");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendChatMessage);
  }
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // 9. 신고 폼 제출
  const reportForm = document.getElementById("reportSubmitBtn");
  if (reportForm) {
    reportForm.addEventListener("click", () => {
      const modal = document.getElementById("reportModal");
      if (modal) modal.classList.remove("active");
      const selectedReason = document.querySelector("input[name='report_reason']:checked");
      const reasonText = selectedReason ? selectedReason.parentElement.textContent.trim() : "기타 신고";
      if (window.HobakDB && typeof window.HobakDB.submitReport === "function" && currentProduct) {
        window.HobakDB.submitReport(currentProduct.id, reasonText);
      }
      showToast("🚨 신고가 정상적으로 접수되었습니다. 검토 후 처리됩니다.");
    });
  }
}

/**
 * 채팅 모달 열기
 */
function openChatModal() {
  if (!currentProduct) return;

  const modal = document.getElementById("chatModal");
  const nickname = (currentProduct.seller && currentProduct.seller.nickname) || "판매자";

  // 모달 헤더 및 상품 미리보기 정보 바인딩
  const title = document.getElementById("chatModalSellerName");
  if (title) title.textContent = `${nickname}님과의 채팅`;

  const thumb = document.getElementById("chatModalThumb");
  if (thumb) thumb.src = currentProduct.image;

  const itemTitle = document.getElementById("chatModalTitle");
  if (itemTitle) itemTitle.textContent = currentProduct.title;

  const itemPrice = document.getElementById("chatModalPrice");
  if (itemPrice) {
    itemPrice.textContent = currentProduct.isFree || currentProduct.price === 0
      ? "나눔🧡"
      : `${Number(currentProduct.price).toLocaleString()}원`;
  }

  // 요구사항: "판매자 2222님과 채팅창이 열렸습니다!" 알림/토스트
  showToast(`💬 판매자 ${nickname}님과 채팅창이 열렸습니다!`);

  if (modal) {
    modal.classList.add("active");
    const input = document.getElementById("chatMessageInput");
    if (input) input.focus();
  }
}

/**
 * 채팅 메시지 전송 기능 (시뮬레이션)
 */
function sendChatMessage() {
  const input = document.getElementById("chatMessageInput");
  const history = document.getElementById("chatHistoryArea");
  if (!input || !history) return;

  const text = input.value.trim();
  if (!text) return;

  // 1. 사용자 말풍선 추가
  const userBubble = document.createElement("div");
  userBubble.className = "chat-bubble user";
  userBubble.textContent = text;
  history.appendChild(userBubble);
  input.value = "";
  history.scrollTop = history.scrollHeight;

  // Supabase 실시간 메시지 저장 연동
  if (window.HobakDB && typeof window.HobakDB.sendChatMessage === "function" && currentProduct) {
    window.HobakDB.sendChatMessage(
      currentProduct.id,
      text,
      currentProduct.seller ? currentProduct.seller.id : null
    );
  }

  // 2. 판매자 자동 응답 시뮬레이션 (1초 후)
  setTimeout(() => {
    const sellerBubble = document.createElement("div");
    sellerBubble.className = "chat-bubble seller";
    const nickname = (currentProduct && currentProduct.seller && currentProduct.seller.nickname) || "판매자";
    sellerBubble.textContent = `안녕하세요! ${nickname}입니다. 메시지 확인했습니다. 편하신 거래 시간 말씀해주시면 맞춰볼게요! 😊`;
    history.appendChild(sellerBubble);
    history.scrollTop = history.scrollHeight;
  }, 1000);
}

/**
 * 공유하기 기능 (Web Share API or 클립보드 복사)
 */
function handleShare() {
  const shareData = {
    title: currentProduct ? currentProduct.title : "호박마켓",
    text: `${currentProduct ? currentProduct.title : "호박마켓 상품"} - 호박마켓에서 확인해보세요!`,
    url: window.location.href
  };

  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast("🔗 링크가 클립보드에 복사되었습니다!"))
      .catch(() => showToast("주소창 URL을 복사해주세요."));
  }
}

/**
 * 신고 모달 열기
 */
function openReportModal() {
  const modal = document.getElementById("reportModal");
  if (modal) modal.classList.add("active");
}

/**
 * 이미지 확대 모달 열기
 */
function openZoomModal() {
  const modal = document.getElementById("zoomModal");
  const zoomImg = document.getElementById("zoomModalImage");
  if (zoomImg && currentProduct) {
    zoomImg.src = currentProduct.image;
  }
  if (modal) modal.classList.add("active");
}

/**
 * 토스트 알림 표시
 */
function showToast(message) {
  let toast = document.getElementById("hobakToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "hobakToast";
    toast.className = "hobak-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toast.timeoutId);
  toast.timeoutId = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

/**
 * HTML 특수문자 이스케이프 유틸
 */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
