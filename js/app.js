/**
   GAON Health Checkup Kiosk - Video App Controller (Local PC Video Version)
   Manages clock updates, responsive scaling, interactive modals, video preloading/autoplay,
   audio bypassing constraints, and fallback error display for local video streams.
 */

document.addEventListener("DOMContentLoaded", () => {
  initKioskSystem();
});

/**
 * Kiosk Modal & Video Core System
 */
function initKioskSystem() {
  // Elements
  const examButtons = document.querySelectorAll(".exam-card-btn");
  const modalOverlay = document.getElementById("video-modal");
  const modalTitle = document.getElementById("modal-title-text");
  const closeBtn = document.getElementById("btn-close-modal");
  const doneBtn = document.getElementById("btn-modal-done");
  
  const video = document.getElementById("kiosk-video");
  const muteBtn = document.getElementById("btn-video-mute");
  const muteIcon = document.getElementById("mute-icon");
  const replayBtn = document.getElementById("btn-video-replay");
  
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

  // Open modal and load/play video
  function openVideoModal(type, videoUrl) {
    // 1. Update titles & codes
    modalTitle.textContent = examTitles[type] || "안내 동영상 재생";
    fallbackUrlCode.textContent = videoUrl;

    // Reset Fallback Overlay to loading state
    fallbackOverlay.classList.add("active");
    fallbackStatusMsg.textContent = "로컬 비디오 로드 중...";
    fallbackOverlay.querySelector(".status-icon").className = "fa-solid fa-circle-notch status-icon fa-spin";

    // 2. Configure video tags
    video.src = videoUrl;
    video.load();

    // 3. Open overlay panel
    modalOverlay.classList.add("active");

    // Tactile feedback sound
    playBeep(650, 0.08);

    // 4. Autoplay execution with browser audio constraints bypassed (initially muted)
    video.muted = true;
    updateMuteUI(true);

    // Play video
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Playback started successfully
          console.log(`Video playback started for: ${videoUrl}`);
        })
        .catch(err => {
          console.warn("Local file autoplay failed or blocked:", err);
          showFallbackError(videoUrl);
        });
    }
  }

  // Hide the loading overlay when the video starts playing
  video.onplaying = () => {
    fallbackOverlay.classList.remove("active");
    console.log("Video is now playing. Hiding loading screen.");
  };

  // Handle Close Action
  function closeVideoModal() {
    modalOverlay.classList.remove("active");
    
    // Stop video and release resource
    video.pause();
    video.src = "";
    
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

  // Mute/Unmute toggle handler
  muteBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    updateMuteUI(video.muted);
    playBeep(600, 0.04);
  });

  function updateMuteUI(isMuted) {
    if (isMuted) {
      muteIcon.className = "fa-solid fa-volume-xmark";
      muteBtn.classList.add("muted-active");
    } else {
      muteIcon.className = "fa-solid fa-volume-high";
      muteBtn.classList.remove("muted-active");
    }
  }

  // Replay handler
  replayBtn.addEventListener("click", () => {
    video.currentTime = 0;
    video.play();
    playBeep(700, 0.05);
  });

  // Video playback error listener
  video.addEventListener("error", (e) => {
    console.warn("HTML5 Video element encountered error:", e);
    showFallbackError(video.src);
  });

  // Show Connection/Error Fallback Panel
  function showFallbackError(url) {
    fallbackOverlay.classList.add("active");
    fallbackStatusMsg.textContent = "로컬 비디오 재생 실패";
    fallbackOverlay.querySelector(".status-icon").className = "fa-solid fa-circle-exclamation status-icon";
    console.log(`Fallback display triggered for url: ${url}`);
  }

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
