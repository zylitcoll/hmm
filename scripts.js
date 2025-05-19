// Configuration
const config = {
  baseUrl: "https://www.dramahouse.app/video/",
  title: "不爱后，白月光后悔了",
  currentEpisode: 1,
  totalEpisodes: 90,
  defaultSubtitleLang: "id",
};

// DOM Elements
const elements = {
  video: document.getElementById("video"),
  episodeNum: document.getElementById("episode-num"),
  judulElemen: document.getElementById("judul"),
  pageTitle: document.getElementById("page-title"),
  episodeList: document.getElementById("episode-list"),
  searchBox: document.getElementById("search-box"),
  prevBtn: document.getElementById("prev-btn"),
  nextBtn: document.getElementById("next-btn"),
  loading: document.getElementById("loading"),
  toast: document.getElementById("toast"),
};

// State
const state = {
  isLoading: false,
  episodes: [],
};

// Initialize the player
function init() {
  buildEpisodeList();
  updateVideo();
  setupEventListeners();
}

// Build the episode list
function buildEpisodeList() {
  elements.episodeList.innerHTML = "";
  state.episodes = Array.from(
    { length: config.totalEpisodes },
    (_, i) => i + 1,
  );

  state.episodes.forEach((ep) => {
    const item = document.createElement("div");
    item.className = "episode-item";
    item.innerHTML = `
      <span class="episode-number">${ep}</span>
      <span class="episode-text">Episode ${ep}</span>
    `;
    item.onclick = () => loadEpisode(ep);
    elements.episodeList.appendChild(item);
  });
}

// Update UI based on current episode
function updateUI() {
  elements.judulElemen.textContent = config.title;
  elements.pageTitle.textContent = `${config.title} - Episode ${config.currentEpisode}`;
  elements.episodeNum.textContent = config.currentEpisode;

  elements.prevBtn.disabled = config.currentEpisode <= 1;
  elements.nextBtn.disabled = config.currentEpisode >= config.totalEpisodes;

  highlightActiveEpisode();
}

// Highlight active episode in sidebar
function highlightActiveEpisode() {
  document.querySelectorAll(".episode-item").forEach((item, index) => {
    item.classList.toggle("active", index + 1 === config.currentEpisode);
  });
}

// Load a specific episode
async function loadEpisode(episode) {
  if (state.isLoading) return;

  config.currentEpisode = episode;
  state.isLoading = true;
  showLoading();

  try {
    await updateVideo();
  } catch (error) {
    showToast("Failed to load episode");
    console.error("Error loading episode:", error);
  } finally {
    state.isLoading = false;
    hideLoading();
  }
}

// Update video source and subtitles
async function updateVideo() {
  updateUI();

  const mp4Url = `${config.baseUrl}${encodeURIComponent(config.title)}/${config.currentEpisode}.mp4`;
  const srtUrl = `${config.baseUrl}${encodeURIComponent(config.title)}/${config.currentEpisode}_${config.defaultSubtitleLang}.srt`;

  // Clear existing tracks
  [...elements.video.querySelectorAll("track")].forEach((track) =>
    track.remove(),
  );

  // Reset video
  elements.video.pause();
  elements.video.removeAttribute("src");
  elements.video.load();

  // Set new source
  elements.video.src = mp4Url;

  try {
    const res = await fetch(srtUrl);
    if (res.ok) {
      const srtText = await res.text();
      const vttText = convertSRTtoVTT(srtText);
      const vttBlob = new Blob([vttText], { type: "text/vtt" });
      const vttUrl = URL.createObjectURL(vttBlob);

      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = "Subtitles";
      track.srclang = config.defaultSubtitleLang;
      track.src = vttUrl;
      track.default = true;
      elements.video.appendChild(track);

      elements.video.load();

      elements.video.oncanplay = () => {
        setTimeout(() => {
          if (elements.video.textTracks.length > 0) {
            elements.video.textTracks[0].mode = "showing";
          }
          elements.video
            .play()
            .catch((e) => console.warn("Autoplay prevented:", e));
        }, 300);
      };
    } else {
      console.warn("Subtitle not found:", srtUrl);
      elements.video.oncanplay = () => {
        elements.video
          .play()
          .catch((e) => console.warn("Autoplay prevented:", e));
      };
    }
  } catch (err) {
    console.error("Error loading subtitle:", err);
    elements.video.oncanplay = () => {
      elements.video
        .play()
        .catch((e) => console.warn("Autoplay prevented:", e));
    };
  }
}

// Convert SRT to VTT format
function convertSRTtoVTT(srt) {
  return (
    "WEBVTT\n\n" +
    srt
      .replace(/\r+/g, "")
      .replace(/(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) -->/g, "$2 -->")
      .replace(/,/g, ".")
  );
}

// Navigation functions
function prev() {
  if (config.currentEpisode > 1) {
    loadEpisode(config.currentEpisode - 1);
  }
}

function next() {
  if (config.currentEpisode < config.totalEpisodes) {
    loadEpisode(config.currentEpisode + 1);
  }
}

// UI Helpers
function showLoading() {
  elements.loading.style.display = "flex";
}

function hideLoading() {
  elements.loading.style.display = "none";
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 3000);
}

// Event listeners
function setupEventListeners() {
  // Auto next episode
  elements.video.addEventListener("ended", () => {
    if (config.currentEpisode < config.totalEpisodes) {
      next();
    } else {
      showToast("🎉 All episodes completed!");
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;

    switch (e.key) {
      case "ArrowLeft":
        prev();
        break;
      case "ArrowRight":
        next();
        break;
      case " ":
        if (elements.video.paused) {
          elements.video.play();
        } else {
          elements.video.pause();
        }
        break;
    }
  });

  // Search functionality
  elements.searchBox.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    document.querySelectorAll(".episode-item").forEach((item) => {
      const episodeText = item.textContent.toLowerCase();
      item.style.display = episodeText.includes(searchTerm) ? "flex" : "none";
    });
  });
}

// Initialize the app
document.addEventListener("DOMContentLoaded", init);
