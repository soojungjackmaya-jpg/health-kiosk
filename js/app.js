/**
   GAON Health Checkup Kiosk - Video App Controller (Google Drive iframe version)
   Manages interactive modals, iframe source swapping, and loading spinner overlays.
 */

document.addEventListener("DOMContentLoaded", () => {
  initKioskSystem();
});

/**
 * Kiosk Modal & iframe Video Core System
 */
function initKioskSystem() {
  // Elements
  const examButtons = document.querySelectorAll(".exam-card-btn");
  const modalOverlay = document.getElementById("video-modal");
  const modalTitle = document.getElementById("modal-title-text");
  const closeBtn = document.getElementById("btn-close-modal");
  const doneBtn = document.getElementById("btn-modal-done");
  
  const iframe = document.getElementById("kiosk-iframe");
  const fallbackOverlay = document.getElementById("video-fallback");
  const fallbackUrlCode = document.getElementById("fallback-target-url");
  const fallbackStatusMsg = fallbackOverlay.querySelector(".status-msg");

  // Exam Titles Dictionary
  const examTitles = {
    A: "A. 위내시경·유방촬영 안내",
    B: "B. 골밀도 검사 안내",
    C: "C. 대장내시경 안내"
  };

  // Click handler for A/B/C exam buttons
  examButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      const videoUrl = btn.dataset.video;

      openVideoModal(type, videoUrl);
    });
  });

  // Open modal and load Google Drive preview link
  function openVideoModal(type, videoUrl) {
    // 1. Update titles & codes
    modalTitle.textContent = examTitles[type] || "안내 동영상 재생";
    fallbackUrlCode.textContent = videoUrl;

    // Reset Fallback Overlay to loading state
    fallbackOverlay.classList.add("active");
    fallbackStatusMsg.textContent = "안내 영상을 불러오는 중...";
    fallbackOverlay.querySelector(".status-icon").className = "fa-solid fa-circle-notch status-icon fa-spin";

    // 2. Set iframe src (trigger load)
    iframe.src = videoUrl;

    // 3. Open overlay panel
    modalOverlay.classList.add("active");

    // Tactile feedback sound
    playBeep(650, 0.08);
  }

  // Handle iframe load completion to hide the loader spinner
  iframe.onload = () => {
    fallbackOverlay.classList.remove("active");
    console.log("iframe content loaded successfully.");
  };

  // Handle Close Action
  function closeVideoModal() {
    modalOverlay.classList.remove("active");
    
    // Clear iframe source to stop playback immediately
    iframe.src = "about:blank";
    
    playBeep(500, 0.08);
  }

  // Bind close buttons
  closeBtn.addEventListener("click", closeVideoModal);
  doneBtn.addEventListener("click", closeVideoModal);

  // Close when clicking directly on overlay dimming area
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeVideoModal();
    }
  });

  // Interactive Beep tone for tactile feedback
  function playBeep(frequency = 800, duration = 0.1) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Tactile beep sound failed to play", e);
    }
  }
}
