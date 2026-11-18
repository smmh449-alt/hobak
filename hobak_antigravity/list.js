/**
 * 호박마켓 상품 목록 페이지 로직 (list.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  // 상태 관리 객체
  const state = {
    products: [],
    filteredProducts: [],
    searchQuery: "",
    currentCategory: "전체",
    currentLocation: "전체",
    onlyAvailable: false,
    sortOption: "latest",
    currentPage: 1,
    itemsPerPage: 8, // 한 페이지당 노출 상품 수
    likedProductIds: getLikedProductIds()
  };

  // DOM 요소 캐싱
  const elements = {
    productGrid: document.getElementById("productGrid"),
    productCount: document.getElementById("productCount"),
    listHeading: document.getElementById("listHeading"),
    activeFilterBadge: document.getElementById("activeFilterBadge"),
    emptyState: document.getElementById("emptyState"),
    emptyDesc: document.getElementById("emptyDesc"),
    resetFiltersBtn: document.getElementById("resetFiltersBtn"),
    paginationWrap: document.getElementById("paginationWrap"),
    
    // 검색 관련
    headerSearchForm: document.getElementById("headerSearchForm"),
    searchInput: document.getElementById("searchInput"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    searchSubmitBtn: document.getElementById("searchSubmitBtn"),
    
    // 필터 관련
    categoryNav: document.getElementById("categoryNav"),
    hotChips: document.querySelectorAll(".chips-scroll-container .chip"),
    onlyAvailableCheck: document.getElementById("onlyAvailableCheck"),
    sortSelect: document.getElementById("sortSelect"),
    
    // 동네 설정 모달 관련
    openLocationModalBtn: document.getElementById("openLocationModalBtn"),
    closeLocationModalBtn: document.getElementById("closeLocationModalBtn"),
    locationModal: document.getElementById("locationModal"),
    currentLocationText: document.getElementById("currentLocationText"),
    locItems: document.querySelectorAll(".location-preset-list .loc-item"),
    
    // 토스트
    toastContainer: document.getElementById("toastContainer")
  };

  // 1. 초기 데이터 로드
  initData();

  async function initData() {
    // shared/data.js의 HobakDB 검증 (초기 로컬 캐시 즉시 렌더)
    if (window.HobakDB && typeof window.HobakDB.getProducts === "function") {
      state.products = window.HobakDB.getProducts();
    } else {
      console.warn("HobakDB not found. Fallback to default.");
      state.products = [];
    }

    // URL 쿼리 파라미터 파싱 (?search=, ?cat=)
    const urlParams = new URLSearchParams(window.location.search);
    const qParam = urlParams.get("search");
    const catParam = urlParams.get("category");

    if (qParam) {
      state.searchQuery = qParam.trim();
      elements.searchInput.value = state.searchQuery;
      elements.clearSearchBtn.style.display = "flex";
    }

    if (catParam) {
      state.currentCategory = catParam.trim();
      updateCategoryTabsUI();
    }

    // 이벤트 리스너 등록
    bindEvents();

    // 초기 필터링 및 렌더링
    applyFilters();

    // Supabase 비동기 최신 데이터 동기화
    if (window.HobakDB && typeof window.HobakDB.fetchProducts === "function") {
      try {
        const fresh = await window.HobakDB.fetchProducts();
        if (fresh && fresh.length > 0) {
          state.products = fresh;
          applyFilters();
        }
      } catch (err) {
        console.warn("Supabase fetchProducts warning:", err);
      }
    }
  }

  // 2. 이벤트 바인딩
  function bindEvents() {
    // 검색창 입력 이벤트 (실시간 X버튼 토글)
    elements.searchInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      elements.clearSearchBtn.style.display = val.length > 0 ? "flex" : "none";
      // 실시간 디바운스 검색 (300ms)
      debounceSearch(val);
    });

    // 검색창 엔터 및 폼 제출
    elements.headerSearchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      executeSearch();
    });

    // 검색 X 버튼 클릭
    elements.clearSearchBtn.addEventListener("click", () => {
      elements.searchInput.value = "";
      elements.clearSearchBtn.style.display = "none";
      state.searchQuery = "";
      state.currentPage = 1;
      clearChipActiveState();
      applyFilters();
      elements.searchInput.focus();
    });

    // 카테고리 탭 클릭
    elements.categoryNav.addEventListener("click", (e) => {
      const tab = e.target.closest(".cat-tab");
      if (!tab) return;
      const category = tab.dataset.category;
      if (state.currentCategory === category) return;

      state.currentCategory = category;
      state.currentPage = 1;
      updateCategoryTabsUI();
      applyFilters();
    });

    // 인기 검색어 칩 클릭
    elements.hotChips.forEach(chip => {
      chip.addEventListener("click", () => {
        const keyword = chip.dataset.keyword;
        if (state.searchQuery === keyword) {
          // 이미 선택된 칩 다시 클릭 시 해제
          state.searchQuery = "";
          elements.searchInput.value = "";
          elements.clearSearchBtn.style.display = "none";
          chip.classList.remove("active");
        } else {
          state.searchQuery = keyword;
          elements.searchInput.value = keyword;
          elements.clearSearchBtn.style.display = "flex";
          clearChipActiveState();
          chip.classList.add("active");
        }
        state.currentPage = 1;
        applyFilters();
      });
    });

    // 거래 가능만 보기 체크박스 변경
    elements.onlyAvailableCheck.addEventListener("change", (e) => {
      state.onlyAvailable = e.target.checked;
      state.currentPage = 1;
      applyFilters();
    });

    // 정렬 셀렉트 변경
    elements.sortSelect.addEventListener("change", (e) => {
      state.sortOption = e.target.value;
      state.currentPage = 1;
      applyFilters();
    });

    // 필터 초기화 버튼
    elements.resetFiltersBtn.addEventListener("click", () => {
      resetAllFilters();
    });

    // 동네 설정 모달 열기/닫기
    elements.openLocationModalBtn.addEventListener("click", () => {
      elements.locationModal.classList.add("show");
    });

    elements.closeLocationModalBtn.addEventListener("click", () => {
      elements.locationModal.classList.remove("show");
    });

    elements.locationModal.addEventListener("click", (e) => {
      if (e.target === elements.locationModal) {
        elements.locationModal.classList.remove("show");
      }
    });

    // 동네 프리셋 선택
    elements.locItems.forEach(item => {
      item.addEventListener("click", () => {
        const selectedLoc = item.dataset.loc;
        elements.locItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        state.currentLocation = selectedLoc;
        if (selectedLoc === "전체") {
          elements.currentLocationText.textContent = "전국 모든 지역 매물";
          showToast("전체 지역 상품을 둘러봅니다.");
        } else {
          elements.currentLocationText.textContent = `${selectedLoc} 근처`;
          showToast(`동네가 '${selectedLoc}'(으)로 변경되었습니다.`);
        }

        elements.locationModal.classList.remove("show");
        state.currentPage = 1;
        applyFilters();
      });
    });
  }

  // 디바운스 검색 함수
  let searchTimeout = null;
  function debounceSearch(val) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = val;
      state.currentPage = 1;
      applyFilters();
    }, 250);
  }

  function executeSearch() {
    state.searchQuery = elements.searchInput.value.trim();
    state.currentPage = 1;
    applyFilters();
  }

  function clearChipActiveState() {
    elements.hotChips.forEach(c => c.classList.remove("active"));
  }

  function updateCategoryTabsUI() {
    const tabs = elements.categoryNav.querySelectorAll(".cat-tab");
    tabs.forEach(tab => {
      if (tab.dataset.category === state.currentCategory) {
        tab.classList.add("active");
        tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      } else {
        tab.classList.remove("active");
      }
    });
  }

  function resetAllFilters() {
    state.searchQuery = "";
    state.currentCategory = "전체";
    state.currentLocation = "전체";
    state.onlyAvailable = false;
    state.sortOption = "latest";
    state.currentPage = 1;

    elements.searchInput.value = "";
    elements.clearSearchBtn.style.display = "none";
    elements.onlyAvailableCheck.checked = false;
    elements.sortSelect.value = "latest";
    elements.currentLocationText.textContent = "충남 아산시 온양읍 화정동 근처";
    
    // 모달 아이템 초기화
    elements.locItems.forEach(item => {
      item.classList.toggle("active", item.dataset.loc === "충남 아산시 온양읍 화정동");
    });

    clearChipActiveState();
    updateCategoryTabsUI();
    applyFilters();
    showToast("필터가 초기화되었습니다.");
  }

  // 3. 필터링 및 정렬 파이프라인
  function applyFilters() {
    let result = [...state.products];

    // 1) 카테고리 필터
    if (state.currentCategory !== "전체") {
      result = result.filter(item => {
        // '남성패션'일 경우 '남성패션/잡화' 대응
        if (state.currentCategory === "남성패션/잡화" || state.currentCategory === "남성패션") {
          return item.category && (item.category.includes("남성패션") || item.category.includes("남성의류"));
        }
        return item.category === state.currentCategory;
      });
    }

    // 2) 검색어 필터 (제목, 상세설명, 지역)
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      result = result.filter(item => {
        const titleMatch = (item.title || "").toLowerCase().includes(q);
        const descMatch = (item.description || "").toLowerCase().includes(q);
        const locMatch = (item.location || "").toLowerCase().includes(q);
        const catMatch = (item.category || "").toLowerCase().includes(q);
        return titleMatch || descMatch || locMatch || catMatch;
      });
    }

    // 3) 거래가능 상품만 보기 필터 (판매완료 제외)
    if (state.onlyAvailable) {
      result = result.filter(item => item.status !== "판매완료");
    }

    // 4) 지역 필터 (전체가 아닌 특정 지역이 선택된 경우)
    if (state.currentLocation && state.currentLocation !== "전체") {
      const locKey = state.currentLocation.split(" ").slice(-1)[0] || state.currentLocation;
      result = result.filter(item => {
        return (item.location || "").includes(locKey) || (item.location || "").includes("온양읍");
      });
    }

    // 5) 정렬 옵션 적용
    result.sort((a, b) => {
      switch (state.sortOption) {
        case "popular": // 관심(likes) 많은 순
          return (b.likes || 0) - (a.likes || 0);
        case "priceAsc": // 낮은 가격순
          return (a.price || 0) - (b.price || 0);
        case "priceDesc": // 높은 가격순
          return (b.price || 0) - (a.price || 0);
        case "latest": // 최신순 (기본)
        default:
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
      }
    });

    state.filteredProducts = result;
    renderUI();
  }

  // 4. UI 렌더링
  function renderUI() {
    const totalCount = state.filteredProducts.length;
    elements.productCount.textContent = totalCount;

    // 필터 뱃지 표시
    updateToolbarBadges();

    // 빈 화면(Empty State) 처리
    if (totalCount === 0) {
      elements.productGrid.style.display = "none";
      elements.paginationWrap.style.display = "none";
      elements.emptyState.style.display = "block";

      if (state.searchQuery) {
        elements.emptyDesc.innerHTML = `<strong>'${escapeHtml(state.searchQuery)}'</strong>에 대한 검색 결과가 없습니다.<br>단어의 철자가 정확한지 확인하시거나, 다른 검색어로 찾아보세요.`;
      } else {
        elements.emptyDesc.innerHTML = `선택하신 조건에 일치하는 중고거래 매물이 없습니다.<br>다른 카테고리나 지역을 선택해 보세요.`;
      }
      return;
    }

    elements.emptyState.style.display = "none";
    elements.productGrid.style.display = "grid";
    elements.paginationWrap.style.display = "flex";

    // 페이지네이션 슬라이스
    const totalPages = Math.ceil(totalCount / state.itemsPerPage);
    if (state.currentPage > totalPages) {
      state.currentPage = totalPages;
    }

    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const currentBatch = state.filteredProducts.slice(startIndex, startIndex + state.itemsPerPage);

    // 카드 목록 렌더링
    renderProductCards(currentBatch);

    // 페이지네이션 버튼 렌더링
    renderPagination(totalPages);
  }

  // 상단 뱃지 갱신
  function updateToolbarBadges() {
    const parts = [];
    if (state.currentCategory !== "전체") {
      parts.push(`카테고리: ${state.currentCategory}`);
    }
    if (state.searchQuery) {
      parts.push(`검색어: "${state.searchQuery}"`);
    }
    if (state.onlyAvailable) {
      parts.push("거래 가능만");
    }

    if (parts.length > 0) {
      elements.activeFilterBadge.textContent = parts.join(" · ");
      elements.activeFilterBadge.style.display = "inline-flex";
    } else {
      elements.activeFilterBadge.style.display = "none";
    }
  }

  // 상품 카드들 생성
  function renderProductCards(products) {
    elements.productGrid.innerHTML = "";

    products.forEach(product => {
      const card = createProductCardElement(product);
      elements.productGrid.appendChild(card);
    });
  }

  // 개별 상품 카드 DOM 요소 생성
  function createProductCardElement(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `${product.title}, 가격: ${formatPrice(product)}`);

    // 판매 상태 뱃지 판별
    let statusBadgeHtml = "";
    const isCompleted = product.status === "판매완료";
    const isReserved = product.status === "예약중";
    const isFree = product.isFree || product.price === 0;

    if (isCompleted) {
      statusBadgeHtml = `<span class="badge-status completed">거래완료</span>`;
    } else if (isReserved) {
      statusBadgeHtml = `<span class="badge-status reserved">예약중</span>`;
    } else if (isFree) {
      statusBadgeHtml = `<span class="badge-status free">무료나눔</span>`;
    }

    // 찜(하트) 여부 판별
    const isLiked = state.likedProductIds.includes(String(product.id));

    // 가격 텍스트
    const priceText = formatPrice(product);

    // 썸네일 이미지 에러 대비 fallback
    const fallbackImage = "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80";
    const imgSrc = product.image || fallbackImage;
    const sellerNickname = (product.seller && product.seller.nickname) || "호박이";

    card.innerHTML = `
      <div class="card-thumbnail-wrap ${isCompleted ? 'is-completed' : ''}">
        ${statusBadgeHtml}
        <img class="card-image" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImage}';">
        <button type="button" class="btn-card-heart ${isLiked ? 'is-liked' : ''}" data-id="${product.id}" title="${isLiked ? '관심 해제' : '관심 추가'}" aria-label="관심 목록에 추가">
          <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        </button>
      </div>
      <div class="card-content">
        <h3 class="card-title">${escapeHtml(product.title)}</h3>
        <p class="card-meta">
          <span class="card-author"><i class="fa-regular fa-user"></i> ${escapeHtml(sellerNickname)}</span>
          <span> · </span>
          <span>${escapeHtml(formatLocation(product.location))}</span>
          <span> · </span>
          <span>${escapeHtml(product.timeAgo || "방금 전")}</span>
        </p>
        <div class="card-bottom-row">
          <span class="card-price ${isFree ? 'is-free' : ''}">${priceText}</span>
          <div class="card-counts">
            ${(product.chats > 0) ? `
              <span class="count-item" title="채팅 ${product.chats}">
                <i class="fa-regular fa-comment-dots"></i>
                <span>${product.chats}</span>
              </span>
            ` : ''}
            <span class="count-item like-counter" title="관심 ${product.likes || 0}">
              <i class="fa-regular fa-heart"></i>
              <span class="like-number">${product.likes || 0}</span>
            </span>
          </div>
        </div>
      </div>
    `;

    // 찜 버튼 클릭 이벤트 (버블링 방지)
    const heartBtn = card.querySelector(".btn-card-heart");
    heartBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLike(product.id, heartBtn, card);
    });

    // 카드 클릭 시 상세 페이지로 부드럽게 이동
    card.addEventListener("click", () => {
      navigateToDetail(product.id);
    });

    // 키보드 접근성 (엔터/스페이스바 이동)
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigateToDetail(product.id);
      }
    });

    return card;
  }

  // 상세 페이지 이동 함수
  function navigateToDetail(productId) {
    window.location.href = `detail.html?id=${productId}`;
  }

  // 가격 포맷팅
  function formatPrice(product) {
    if (product.isFree || product.price === 0) {
      return "나눔🧡";
    }
    if (product.priceFormatted) {
      return product.priceFormatted;
    }
    return Number(product.price).toLocaleString("ko-KR") + "원";
  }

  // 지역 텍스트 짧게 축약 (예: "충남 아산시 온양읍 화정동" -> "온양읍 화정동")
  function formatLocation(loc) {
    if (!loc) return "동네 근처";
    const parts = loc.split(" ");
    if (parts.length >= 3) {
      return parts.slice(-2).join(" ");
    }
    return loc;
  }

  // 찜(관심) 토글 로직
  function toggleLike(productId, heartBtn, card) {
    const idStr = String(productId);
    const isCurrentlyLiked = state.likedProductIds.includes(idStr);
    const likeNumberEl = card.querySelector(".like-number");
    
    // 타겟 상품 객체 찾기
    const targetProduct = state.products.find(p => String(p.id) === idStr);

    if (isCurrentlyLiked) {
      // 찜 해제
      state.likedProductIds = state.likedProductIds.filter(id => id !== idStr);
      heartBtn.classList.remove("is-liked");
      heartBtn.querySelector("i").className = "fa-regular fa-heart";
      heartBtn.title = "관심 추가";

      if (targetProduct) {
        targetProduct.likes = Math.max(0, (targetProduct.likes || 1) - 1);
        if (likeNumberEl) likeNumberEl.textContent = targetProduct.likes;
        // DB 업데이트
        if (window.HobakDB && window.HobakDB.updateProduct) {
          window.HobakDB.updateProduct(targetProduct.id, { likes: targetProduct.likes });
        }
      }
      showToast("관심 목록에서 제외했습니다.");
    } else {
      // 찜 추가
      state.likedProductIds.push(idStr);
      heartBtn.classList.add("is-liked");
      heartBtn.querySelector("i").className = "fa-solid fa-heart";
      heartBtn.title = "관심 해제";

      if (targetProduct) {
        targetProduct.likes = (targetProduct.likes || 0) + 1;
        if (likeNumberEl) likeNumberEl.textContent = targetProduct.likes;
        // DB 업데이트
        if (window.HobakDB && window.HobakDB.updateProduct) {
          window.HobakDB.updateProduct(targetProduct.id, { likes: targetProduct.likes });
        }
      }
      showToast("관심 목록에 추가했습니다. 🧡");
    }

    saveLikedProductIds(state.likedProductIds);
  }

  // 5. 페이지네이션 렌더링
  function renderPagination(totalPages) {
    elements.paginationWrap.innerHTML = "";
    if (totalPages <= 1) return;

    // 이전 페이지 버튼
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "page-btn prev-btn";
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.setAttribute("aria-label", "이전 페이지");
    prevBtn.addEventListener("click", () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderUI();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    elements.paginationWrap.appendChild(prevBtn);

    // 페이지 번호 버튼들
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.type = "button";
      pageBtn.className = `page-btn ${i === state.currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.setAttribute("aria-label", `${i} 페이지`);
      pageBtn.addEventListener("click", () => {
        if (state.currentPage !== i) {
          state.currentPage = i;
          renderUI();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
      elements.paginationWrap.appendChild(pageBtn);
    }

    // 다음 페이지 버튼
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "page-btn next-btn";
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.setAttribute("aria-label", "다음 페이지");
    nextBtn.addEventListener("click", () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderUI();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
    elements.paginationWrap.appendChild(nextBtn);
  }

  // 6. 로컬스토리지 찜 관리 헬퍼
  function getLikedProductIds() {
    try {
      const saved = localStorage.getItem("hobak_user_likes");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLikedProductIds(ids) {
    try {
      localStorage.setItem("hobak_user_likes", JSON.stringify(ids));
    } catch (e) {
      console.error(e);
    }
  }

  // 7. 토스트 메시지 함수
  function showToast(message) {
    if (!elements.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.innerHTML = `<span>🎃</span> <span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2500);
  }

  // 전역 노출 (HTML 인라인 onclick 등에서도 호출 가능하도록)
  window.showToast = showToast;

  // HTML 이스케이프 유틸리티
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
