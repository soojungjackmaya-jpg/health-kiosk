/**
   GAON Health Checkup Kiosk - Video App Controller
   Manages interactive modals, video preloading/autoplay,
   audio bypassing constraints, and fallback error display.
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
    fallbackStatusMsg.textContent = "스트리밍 서버 연결 중...";
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
          console.log(`Video playback started for Type ${type}`);
          
          // Set a timeout to check if video load succeeded or stalled
          // Since https://r2.dev returns an HTML doc rather than video, it will trigger error event.
          // In case it doesn't trigger error but just stalls, we check after 2 seconds.
          setTimeout(() => {
            if (video.readyState < 3 && fallbackOverlay.classList.contains("active")) {
              showFallbackError(videoUrl);
            } else if (video.readyState >= 3) {
              fallbackOverlay.classList.remove("active");
            }
          }, 2000);
        })
        .catch(err => {
          console.warn("Autoplay block detected or file loading error:", err);
          showFallbackError(videoUrl);
        });
    }
  }

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
    fallbackStatusMsg.textContent = "안내 영상 스트리밍 연결 실패";
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
