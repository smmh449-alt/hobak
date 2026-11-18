/**
 * 호박마켓 글쓰기 / 상품 등록 컨트롤러 (write.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. 상태 변수 정의
  const MAX_PHOTOS = 10;
  let uploadedPhotos = []; // Base64 or Unsplash URL string array
  let previousPriceBeforeFree = "";

  // 2. DOM 요소 캐싱
  const btnBack = document.getElementById("btnBack");
  const btnCancel = document.getElementById("btnCancel");
  const btnHeaderSubmit = document.getElementById("btnHeaderSubmit");
  const btnSubmitMain = document.getElementById("btnSubmitMain");
  const writeForm = document.getElementById("writeForm");

  // 사진 관련
  const photoFileInput = document.getElementById("photoFileInput");
  const photoPreviewTrack = document.getElementById("photoPreviewTrack");
  const photoCountBadge = document.getElementById("photoCountBadge");
  const triggerCount = document.getElementById("triggerCount");
  const sampleChips = document.getElementById("sampleChips");

  // 제목
  const titleInput = document.getElementById("titleInput");
  const titleCharCount = document.getElementById("titleCharCount");
  const titleError = document.getElementById("titleError");

  // 카테고리
  const categoryChipGroup = document.getElementById("categoryChipGroup");
  const selectedCategoryInput = document.getElementById("selectedCategory");
  const categoryError = document.getElementById("categoryError");

  // 가격
  const priceInput = document.getElementById("priceInput");
  const priceFormattedPreview = document.getElementById("priceFormattedPreview");
  const isFreeCheck = document.getElementById("isFreeCheck");
  const allowSuggestCheck = document.getElementById("allowSuggestCheck");
  const priceError = document.getElementById("priceError");

  // 장소
  const locationInput = document.getElementById("locationInput");
  const locationError = document.getElementById("locationError");
  const quickLocations = document.querySelector(".quick-locations");

  // 설명
  const descInput = document.getElementById("descInput");
  const descCharCount = document.getElementById("descCharCount");
  const descError = document.getElementById("descError");

  // 판매자
  const sellerNickname = document.getElementById("sellerNickname");

  // 토스트
  const hobakToast = document.getElementById("hobakToast");

  // 수정 모드 확인 (?edit=ID)
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("edit");
  let isEditMode = !!editId;
  let editingProduct = null;

  async function checkEditMode() {
    if (!editId) return;
    try {
      editingProduct = window.HobakDB.getProductById(editId);
      if (!editingProduct && typeof window.HobakDB.fetchProductById === "function") {
        editingProduct = await window.HobakDB.fetchProductById(editId);
      }
      if (!editingProduct) return;

      // 타이틀 및 버튼 변경
      const pageTitle = document.querySelector(".write-page-title span:last-child");
      if (pageTitle) pageTitle.textContent = "게시글 수정";
      const bannerTitle = document.querySelector(".banner-title");
      if (bannerTitle) bannerTitle.textContent = "호박마켓 상품 수정하기";
      const bannerSub = document.querySelector(".banner-subtitle");
      if (bannerSub) bannerSub.textContent = "수정할 정보를 입력하고 완료를 눌러주세요.";
      const submitText = document.querySelector("#btnSubmitMain span");
      if (submitText) submitText.textContent = "수정 완료하기";

      // 폼 값 채우기
      titleInput.value = editingProduct.title || "";
      titleCharCount.textContent = `${titleInput.value.length}/50`;

      // 카테고리
      if (editingProduct.category) {
        selectedCategoryInput.value = editingProduct.category;
        document.querySelectorAll(".cat-chip").forEach(chip => {
          chip.classList.toggle("selected", chip.dataset.category === editingProduct.category);
        });
      }

      // 가격
      if (editingProduct.isFree) {
        isFreeCheck.checked = true;
        priceInput.value = "0";
        priceInput.disabled = true;
        priceFormattedPreview.textContent = "나눔🧡";
      } else {
        isFreeCheck.checked = false;
        priceInput.value = (editingProduct.price || 0).toLocaleString();
        priceFormattedPreview.textContent = `${(editingProduct.price || 0).toLocaleString()}원`;
      }
      allowSuggestCheck.checked = editingProduct.allowSuggest !== false;

      // 위치
      locationInput.value = editingProduct.location || "충남 아산시 온양읍 화정동";

      // 설명
      descInput.value = editingProduct.description || "";
      descCharCount.textContent = `${descInput.value.length}/1000`;

      // 사진
      if (editingProduct.images && editingProduct.images.length > 0) {
        uploadedPhotos = [...editingProduct.images];
      } else if (editingProduct.image) {
        uploadedPhotos = [editingProduct.image];
      }
      renderPhotoPreviews();
      updatePhotoCounter();
    } catch (e) {
      console.warn("Failed to load editing product:", e);
    }
  }

  checkEditMode();

  // 로그인 상태 확인 및 판매자 정보 초기화
  function checkAuthAndInitSeller() {
    const user = window.HobakDB ? window.HobakDB.getCurrentUser() : null;
    if (user && user.nickname) {
      if (sellerNickname) {
        sellerNickname.value = user.nickname;
      }
    } else {
      setTimeout(() => {
        if (window.HobakAuthUI && (!window.HobakDB || !window.HobakDB.getCurrentUser())) {
          window.HobakAuthUI.open("login", "글을 작성하려면 로그인이 필요합니다.", () => {
            const freshUser = window.HobakDB ? window.HobakDB.getCurrentUser() : null;
            if (freshUser && freshUser.nickname && sellerNickname) {
              sellerNickname.value = freshUser.nickname;
            }
          });
        }
      }, 200);
    }
  }
  checkAuthAndInitSeller();

  // -------------------------------------------------------------
  // 3. 샘플 데이터 맵 (빠른 테스트용)
  // -------------------------------------------------------------
  const SAMPLE_PRESETS = {
    jacket: {
      title: "무이음 야상 자켓 (상태 극상, 오버핏)",
      category: "여성의류",
      price: 50000,
      image: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80",
      description: `집에 야상자켓이 너무 많아서 팔아요 ㅠㅠ\n작년 겨울에 진.짜 딱 한번만 입었어요.\n색도 이쁘고 오버핏이라 핏도 너무 예뻐요!\n얼른 구매하세용~ 직거래는 온양읍 화정동 근처에서 가능합니다.`
    },
    headphone: {
      title: "소니 노이즈캔슬링 무선 헤드폰 WH-1000XM4 블랙",
      category: "디지털기기",
      price: 185000,
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
      description: `풀박스 보관중이고 실사용 6개월 정도입니다.\n노이즈캔슬링 기능 정상 작동하고 외관 기스 없이 깨끗합니다.\n케이스 및 충전 케이블 함께 드립니다.`
    },
    table: {
      title: "감성 캠핑 우드 롤테이블 (보관가방 포함)",
      category: "스포츠/레저",
      price: 45000,
      image: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80",
      description: `캠핑 입문할 때 구매해서 3회 사용했습니다.\n너도밤나무 원목이라 단단하고 감성 넘칩니다.\n사이즈 90x60cm 입니다. 승용차 트렁크에 쏙 들어갑니다.`
    },
    cushion: {
      title: "호박 모양 포근한 쿠션 & 인테리어 소품 (무료나눔)",
      category: "가구/인테리어",
      price: 0,
      isFree: true,
      image: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80",
      description: `인테리어용으로 놔뒀던 귀여운 주황색 호박 모양 벨벳 쿠션입니다.\n이사로 짐 정리하면서 무료로 나눔해요.\n꼭 필요하신 분이 데려가셨으면 좋겠습니다!`
    },
    shoes: {
      title: "나이키 에어포스 1 '07 로우 올백 (260mm)",
      category: "남성패션/잡화",
      price: 75000,
      image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
      description: `나이키 공홈 정품입니다. 사이즈 미스로 3회 단시간 착용 후 보관했습니다.\n앞코 주름 약간 외에는 밑창 마모 거의 없는 민트급입니다. 박스 포함입니다.`
    }
  };

  // -------------------------------------------------------------
  // 4. 사진 업로드 및 썸네일 관리
  // -------------------------------------------------------------
  photoFileInput.addEventListener("change", handleFileSelect);

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    if (uploadedPhotos.length + files.length > MAX_PHOTOS) {
      showToast(`사진은 최대 ${MAX_PHOTOS}장까지만 등록할 수 있어요.`, "error");
    }

    const availableSlots = MAX_PHOTOS - uploadedPhotos.length;
    const filesToRead = files.slice(0, availableSlots);

    let readCount = 0;
    filesToRead.forEach(file => {
      if (!file.type.startsWith("image/")) {
        showToast("이미지 파일만 등록할 수 있습니다.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedPhotos.push(event.target.result);
        readCount++;
        if (readCount === filesToRead.length) {
          updatePhotoUI();
          showToast(`사진 ${filesToRead.length}장이 추가되었습니다.`, "success");
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    photoFileInput.value = "";
  }

  // 샘플 사진 원클릭 칩 처리
  sampleChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".sample-chip");
    if (!chip) return;

    const key = chip.dataset.sample;
    const preset = SAMPLE_PRESETS[key];
    if (!preset) return;

    if (uploadedPhotos.length >= MAX_PHOTOS) {
      showToast(`사진은 최대 ${MAX_PHOTOS}장까지 등록 가능합니다.`, "error");
      return;
    }

    // 사진 추가
    uploadedPhotos.push(preset.image);
    updatePhotoUI();

    // 부가 기능: 사용자가 편하게 테스트할 수 있도록 빈 항목들에 프리셋 값 자동 제안 채우기
    if (!titleInput.value.trim()) {
      titleInput.value = preset.title;
      updateTitleCount();
    }
    if (!selectedCategoryInput.value && preset.category) {
      selectCategory(preset.category);
    }
    if (!priceInput.value && !isFreeCheck.checked) {
      if (preset.isFree) {
        isFreeCheck.checked = true;
        handleFreeCheckChange();
      } else {
        priceInput.value = preset.price.toLocaleString();
        updatePriceDisplay();
      }
    }
    if (!descInput.value.trim()) {
      descInput.value = preset.description;
      updateDescCount();
    }

    showToast(`'${preset.title.split(" ")[0]}' 샘플 정보를 불러왔습니다!`, "success");
  });

  function removePhoto(index) {
    uploadedPhotos.splice(index, 1);
    updatePhotoUI();
  }

  function updatePhotoUI() {
    const count = uploadedPhotos.length;
    photoCountBadge.textContent = `${count}/${MAX_PHOTOS}`;
    triggerCount.textContent = `${count}/${MAX_PHOTOS}`;

    photoPreviewTrack.innerHTML = "";
    uploadedPhotos.forEach((src, idx) => {
      const itemEl = document.createElement("div");
      itemEl.className = "photo-preview-item";

      const imgEl = document.createElement("img");
      imgEl.src = src;
      imgEl.alt = `상품 사진 ${idx + 1}`;
      imgEl.className = "photo-preview-img";

      // 대표 사진 뱃지 (첫 번째 사진)
      if (idx === 0) {
        const badgeEl = document.createElement("span");
        badgeEl.className = "photo-badge-main";
        badgeEl.textContent = "대표 사진";
        itemEl.appendChild(badgeEl);
      }

      // 삭제 버튼
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "photo-remove-btn";
      removeBtn.innerHTML = "×";
      removeBtn.title = "사진 삭제";
      removeBtn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        removePhoto(idx);
      });

      itemEl.appendChild(imgEl);
      itemEl.appendChild(removeBtn);
      photoPreviewTrack.appendChild(itemEl);
    });
  }

  // -------------------------------------------------------------
  // 5. 제목 글자수 & 유효성
  // -------------------------------------------------------------
  titleInput.addEventListener("input", updateTitleCount);
  function updateTitleCount() {
    const len = titleInput.value.length;
    titleCharCount.textContent = `${len}/50`;
    if (len >= 45) {
      titleCharCount.classList.add("limit-near");
    } else {
      titleCharCount.classList.remove("limit-near");
    }
    if (len > 0) {
      titleInput.classList.remove("is-invalid");
      titleError.classList.remove("visible");
    }
  }

  // -------------------------------------------------------------
  // 6. 카테고리 칩 선택
  // -------------------------------------------------------------
  categoryChipGroup.addEventListener("click", (e) => {
    const chip = e.target.closest(".cat-chip");
    if (!chip) return;
    const cat = chip.dataset.category;
    selectCategory(cat);
  });

  function selectCategory(categoryName) {
    const allChips = categoryChipGroup.querySelectorAll(".cat-chip");
    allChips.forEach(c => {
      if (c.dataset.category === categoryName) {
        c.classList.add("active");
      } else {
        c.classList.remove("active");
      }
    });
    selectedCategoryInput.value = categoryName;
    categoryError.classList.remove("visible");
  }

  // -------------------------------------------------------------
  // 7. 가격 서식 & 나눔 / 제안 옵션
  // -------------------------------------------------------------
  priceInput.addEventListener("input", (e) => {
    // 숫자 이외의 문자 제거
    let raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw === "") {
      priceInput.value = "";
      priceFormattedPreview.textContent = "0원";
      return;
    }
    const num = parseInt(raw, 10);
    priceInput.value = num.toLocaleString();
    updatePriceDisplay();

    priceInput.classList.remove("is-invalid");
    priceError.classList.remove("visible");
  });

  function updatePriceDisplay() {
    if (isFreeCheck.checked) {
      priceFormattedPreview.textContent = "나눔🧡";
      return;
    }
    const raw = priceInput.value.replace(/,/g, "");
    if (!raw) {
      priceFormattedPreview.textContent = "0원";
    } else {
      priceFormattedPreview.textContent = `${parseInt(raw, 10).toLocaleString()}원`;
    }
  }

  isFreeCheck.addEventListener("change", handleFreeCheckChange);

  function handleFreeCheckChange() {
    if (isFreeCheck.checked) {
      previousPriceBeforeFree = priceInput.value;
      priceInput.value = "0";
      priceInput.disabled = true;
      priceFormattedPreview.textContent = "나눔🧡";
      priceInput.classList.remove("is-invalid");
      priceError.classList.remove("visible");
    } else {
      priceInput.disabled = false;
      priceInput.value = previousPriceBeforeFree || "";
      updatePriceDisplay();
    }
  }

  // -------------------------------------------------------------
  // 8. 거래 희망 장소 (동네)
  // -------------------------------------------------------------
  locationInput.addEventListener("input", () => {
    if (locationInput.value.trim().length > 0) {
      locationInput.classList.remove("is-invalid");
      locationError.classList.remove("visible");
    }
  });

  if (quickLocations) {
    quickLocations.addEventListener("click", (e) => {
      const chip = e.target.closest(".loc-chip");
      if (!chip) return;
      locationInput.value = chip.textContent.trim();
      locationInput.classList.remove("is-invalid");
      locationError.classList.remove("visible");
      showToast(`거래 희망 장소가 설정되었습니다: ${locationInput.value}`, "success");
    });
  }

  // -------------------------------------------------------------
  // 9. 자세한 설명 글자수
  // -------------------------------------------------------------
  descInput.addEventListener("input", updateDescCount);

  function updateDescCount() {
    const len = descInput.value.length;
    descCharCount.textContent = `${len}/1000`;
    if (len >= 950) {
      descCharCount.classList.add("limit-near");
    } else {
      descCharCount.classList.remove("limit-near");
    }
    if (len >= 5) {
      descInput.classList.remove("is-invalid");
      descError.classList.remove("visible");
    }
  }

  // -------------------------------------------------------------
  // 10. 상단 및 하단 네비게이션 액션
  // -------------------------------------------------------------
  btnBack.addEventListener("click", handleExit);
  btnCancel.addEventListener("click", handleExit);

  function handleExit() {
    const hasData = titleInput.value.trim() || descInput.value.trim() || uploadedPhotos.length > 0;
    if (hasData) {
      if (confirm("작성 중인 내용이 저장되지 않았습니다. 목록으로 돌아가시겠습니까?")) {
        window.location.href = "list.html";
      }
    } else {
      window.location.href = "list.html";
    }
  }

  // 상단 헤더 '완료' 버튼 클릭 시 폼 제출 트리거
  btnHeaderSubmit.addEventListener("click", () => {
    writeForm.requestSubmit ? writeForm.requestSubmit() : submitProduct();
  });

  // 폼 제출 이벤트
  writeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitProduct();
  });

  // -------------------------------------------------------------
  // 11. 유효성 검사 및 등록 (HobakDB & Supabase 연동)
  // -------------------------------------------------------------
  async function submitProduct() {
    let isValid = true;
    let firstErrorElement = null;

    // 1) 제목 검사
    const title = titleInput.value.trim();
    if (!title) {
      isValid = false;
      titleInput.classList.add("is-invalid");
      titleError.classList.add("visible");
      if (!firstErrorElement) firstErrorElement = titleInput;
    } else {
      titleInput.classList.remove("is-invalid");
      titleError.classList.remove("visible");
    }

    // 2) 카테고리 검사
    const category = selectedCategoryInput.value.trim();
    if (!category) {
      isValid = false;
      categoryError.classList.add("visible");
      if (!firstErrorElement) firstErrorElement = categoryChipGroup;
    } else {
      categoryError.classList.remove("visible");
    }

    // 3) 가격 검사
    const isFree = isFreeCheck.checked;
    const rawPrice = priceInput.value.replace(/,/g, "").trim();
    let numericPrice = 0;

    if (!isFree) {
      if (rawPrice === "" || isNaN(Number(rawPrice))) {
        isValid = false;
        priceInput.classList.add("is-invalid");
        priceError.textContent = "판매 가격을 입력해주세요 (나눔인 경우 '나눔🧡'을 체크하세요).";
        priceError.classList.add("visible");
        if (!firstErrorElement) firstErrorElement = priceInput;
      } else {
        numericPrice = parseInt(rawPrice, 10);
        priceInput.classList.remove("is-invalid");
        priceError.classList.remove("visible");
      }
    }

    // 4) 거래 희망 장소 검사
    const location = locationInput.value.trim();
    if (!location) {
      isValid = false;
      locationInput.classList.add("is-invalid");
      locationError.classList.add("visible");
      if (!firstErrorElement) firstErrorElement = locationInput;
    } else {
      locationInput.classList.remove("is-invalid");
      locationError.classList.remove("visible");
    }

    // 5) 설명 검사
    const description = descInput.value.trim();
    if (description.length < 5) {
      isValid = false;
      descInput.classList.add("is-invalid");
      descError.classList.add("visible");
      if (!firstErrorElement) firstErrorElement = descInput;
    } else {
      descInput.classList.remove("is-invalid");
      descError.classList.remove("visible");
    }

    // 유효성 실패 시 해당 위치로 스크롤 및 포커스
    if (!isValid) {
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof firstErrorElement.focus === "function") {
          firstErrorElement.focus();
        }
      }
      showToast("필수 입력 항목을 다시 확인해주세요.", "error");
      return;
    }

    // 로그인 상태 최종 확인
    const currentUser = window.HobakDB ? window.HobakDB.getCurrentUser() : null;
    if (!currentUser) {
      if (window.HobakAuthUI) {
        window.HobakAuthUI.open("login", "글을 등록하려면 로그인이 필요합니다.", () => {
          submitProduct();
        });
      } else {
        showToast("로그인이 필요합니다.", "error");
      }
      return;
    }

    // 사진 기본값 처리 (사용자가 사진을 안 올렸더라도 기본 호박마켓 퀄리티 이미지 제공)
    const fallbackImage = "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80";
    const finalImages = uploadedPhotos.length > 0 ? uploadedPhotos : [fallbackImage];
    const representativeImage = finalImages[0];

    // 판매자 정보 구성
    const nickname = (currentUser && currentUser.nickname) || sellerNickname.value.trim() || "호박이";
    // 장소에서 시/군/구 동 추출 (예: 충남 아산시 온양읍 화정동 -> 온양읍, 화정동)
    const locParts = location.split(" ");
    const sellerShortLoc = locParts.length >= 2 ? `${locParts[locParts.length - 2]} ${locParts[locParts.length - 1]}` : location;

    const newProductData = {
      title,
      price: isFree ? 0 : numericPrice,
      priceFormatted: isFree ? "나눔🧡" : `${numericPrice.toLocaleString()}원`,
      isFree,
      allowSuggest: allowSuggestCheck.checked,
      category,
      location,
      image: representativeImage,
      images: finalImages,
      seller: {
        id: currentUser.id,
        nickname: nickname,
        location: sellerShortLoc,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        temperature: 36.5,
        responseRate: "100%"
      },
      description
    };

    // 수정 모드인 경우 업데이트 처리
    if (isEditMode && editId) {
      try {
        btnHeaderSubmit.disabled = true;
        btnSubmitMain.disabled = true;
        showToast("⏳ 수파베이스에 수정사항을 반영하는 중입니다...", "info");

        await window.HobakDB.updateProduct(editId, {
          title: newProductData.title,
          price: newProductData.price,
          isFree: newProductData.isFree,
          allowSuggest: newProductData.allowSuggest,
          category: newProductData.category,
          location: newProductData.location,
          description: newProductData.description,
          images: newProductData.images,
          image: newProductData.image
        });

        showToast("🎉 게시글이 성공적으로 수정되었습니다!", "success");
        setTimeout(() => {
          window.location.href = `detail.html?id=${editId}`;
        }, 1000);
        return;
      } catch (err) {
        console.error("수정 오류:", err);
        showToast("게시글 수정 중 오류가 발생했습니다.", "error");
        btnHeaderSubmit.disabled = false;
        btnSubmitMain.disabled = false;
        return;
      }
    }

    // 신규 등록: DB 저장 (shared/data.js의 HobakDB & Supabase)
    try {
      if (window.HobakDB && typeof window.HobakDB.saveProduct === "function") {
        btnHeaderSubmit.disabled = true;
        btnSubmitMain.disabled = true;
        showToast("⏳ 수파베이스에 상품을 등록하는 중입니다...", "info");

        const savedProduct = await window.HobakDB.saveProduct(newProductData);
        showToast("🎉 상품이 성공적으로 등록되었습니다!", "success");

        // 비활성화 처리로 중복 클릭 방지
        btnHeaderSubmit.disabled = true;
        btnSubmitMain.disabled = true;

        // 1초 후 상세페이지 또는 목록페이지로 이동
        setTimeout(() => {
          if (savedProduct && savedProduct.id) {
            window.location.href = `detail.html?id=${savedProduct.id}`;
          } else {
            window.location.href = "list.html";
          }
        }, 1200);
      } else {
        console.warn("HobakDB is not loaded. Saving to localStorage directly.");
        localStorage.setItem("hobak_latest_registered", JSON.stringify(newProductData));
        showToast("상품이 임시 저장되었습니다.", "success");
        setTimeout(() => {
          window.location.href = "list.html";
        }, 1200);
      }
    } catch (err) {
      console.error("등록 중 오류 발생:", err);
      showToast("상품 등록 중 오류가 발생했습니다. 다시 시도해주세요.", "error");
    }
  }

  // -------------------------------------------------------------
  // 12. 공통 토스트 메시지 헬퍼
  // -------------------------------------------------------------
  let toastTimer = null;
  function showToast(message, type = "normal") {
    if (!hobakToast) return;

    clearTimeout(toastTimer);
    hobakToast.textContent = message;
    hobakToast.className = `hobak-toast show ${type}`;

    toastTimer = setTimeout(() => {
      hobakToast.className = "hobak-toast";
    }, 2800);
  }

  // 초기 렌더링
  updatePhotoUI();
  updateTitleCount();
  updateDescCount();
});