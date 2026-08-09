const PLAYLISTS = Object.freeze({
  "90s": {
    title: "90s Mode",
    description: "Evergreen Bollywood",
    id: "PLMRKdK25AuPVjHl9Kdb-gkBy0Cm7Zi2xo"
  },
  "new": {
    title: "New Mode",
    description: "Recent Hindi favourites",
    id: "PLO7-VO1D0_6MnOoKQGmYNY2OoCOP3GRfm"
  },
  "bhojpuri": {
    title: "Bhojpuri Mode",
    description: "Desi hits for the road",
    id: "PLczcjlYw3G_-x_-e3HhXWuB72811jN2zh"
  }
});

let player = null;
let ready = false;
let mode = "90s";
let generation = 0;
let timer = null;

const $ = id => document.getElementById(id);
const cards = [...document.querySelectorAll(".mode")];

function timeText(value) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const m = Math.floor(value / 60);
  const s = Math.floor(value % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function ui(nextMode, status) {
  mode = nextMode;
  $("modeTitle").textContent = PLAYLISTS[nextMode].title;
  $("status").textContent = status;
  cards.forEach(card => {
    const active = card.dataset.mode === nextMode;
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", String(active));
  });
}

function playing(value) {
  $("playIcon").textContent = value ? "Ⅱ" : "▶";
  $("play").setAttribute("aria-label", value ? "Pause" : "Play");
  $("bars").classList.toggle("playing", value);
}

function buttons(enabled) {
  $("play").disabled = !enabled;
  $("prev").disabled = !enabled;
  $("next").disabled = !enabled;
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (!player || !ready) return;
    const d = Number(player.getDuration?.() || 0);
    const c = Number(player.getCurrentTime?.() || 0);
    $("currentTime").textContent = timeText(c);
    $("duration").textContent = timeText(d);
    $("progressFill").style.width = d > 0 ? `${Math.min(100, c / d * 100)}%` : "0%";
  }, 500);
}

function resetProgress() {
  $("currentTime").textContent = "0:00";
  $("duration").textContent = "0:00";
  $("progressFill").style.width = "0%";
}

function removePlayer() {
  stopTimer();
  ready = false;
  if (player) {
    try { player.stopVideo(); } catch (_) {}
    try { player.destroy(); } catch (_) {}
    player = null;
  }
}

function createFreshHost() {
  const old = $("youtube-player");
  if (old) old.remove();

  const host = document.createElement("div");
  host.id = "youtube-player";
  host.style.width = "320px";
  host.style.height = "180px";
  document.querySelector(".yt-wrap").appendChild(host);
}

function buildPlayer(targetMode, token, autoplay) {
  createFreshHost();

  player = new YT.Player("youtube-player", {
    width: "320",
    height: "180",
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0
    },
    events: {
      onReady: event => {
        if (token !== generation) {
          try { event.target.destroy(); } catch (_) {}
          return;
        }

        ready = true;
        buttons(true);

        if (autoplay) {
          // This call happens as part of a user-triggered mode switch.
          event.target.playVideo();
        } else {
          ui(targetMode, "Ready to start");
        }
      },

      onStateChange: event => {
        if (token !== generation) return;

        if (event.data === YT.PlayerState.PLAYING) {
          playing(true);
          $("status").textContent = "Playing";
          startTimer();
        } else if (event.data === YT.PlayerState.PAUSED) {
          playing(false);
          $("status").textContent = "Paused";
          stopTimer();
        } else if (event.data === YT.PlayerState.BUFFERING) {
          $("status").textContent = "Buffering…";
        } else if (event.data === YT.PlayerState.CUED) {
          playing(false);
          $("status").textContent = "Ready to start";
        } else if (event.data === YT.PlayerState.ENDED) {
          playing(false);
          $("status").textContent = "Playlist ended";
          stopTimer();
        }
      },

      onError: event => {
        if (token !== generation) return;
        ready = false;
        buttons(false);
        playing(false);
        stopTimer();

        const text = {
          2: "Invalid YouTube request.",
          5: "This video cannot play in the HTML5 player.",
          100: "A video is unavailable or private.",
          101: "This video does not allow embedded playback.",
          150: "This video does not allow embedded playback."
        };

        $("status").textContent = text[event.data] || `YouTube error (${event.data})`;
      }
    }
  });
}

function switchMode(nextMode) {
  if (!PLAYLISTS[nextMode]) return;

  const token = ++generation;
  mode = nextMode;
  ui(nextMode, "Loading playlist…");
  playing(false);
  resetProgress();
  buttons(false);

  removePlayer();

  if (window.YT && window.YT.Player) {
    buildPlayer(nextMode, token, true);
  } else {
    const started = Date.now();
    const wait = setInterval(() => {
      if (token !== generation) {
        clearInterval(wait);
        return;
      }
      if (window.YT && window.YT.Player) {
        clearInterval(wait);
        buildPlayer(nextMode, token, true);
      } else if (Date.now() - started > 15000) {
        clearInterval(wait);
        $("status").textContent = "YouTube player failed to load.";
      }
    }, 100);
  }
}

cards.forEach(card => card.addEventListener("click", () => switchMode(card.dataset.mode)));

$("play").addEventListener("click", () => {
  if (!ready || !player) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else player.playVideo();
});

$("prev").addEventListener("click", () => {
  if (ready && player) player.previousVideo();
});

$("next").addEventListener("click", () => {
  if (ready && player) player.nextVideo();
});

document.addEventListener("keydown", event => {
  if (event.target.matches("input,textarea,select")) return;

  if (event.code === "Space") {
    event.preventDefault();
    $("play").click();
  } else if (event.code === "ArrowLeft") {
    if (ready && player) player.previousVideo();
  } else if (event.code === "ArrowRight") {
    if (ready && player) player.nextVideo();
  }
});

window.onYouTubeIframeAPIReady = () => {
  // Initial page load: do not autoplay until the user chooses a mode.
  // This avoids browser autoplay restrictions.
  buildPlayer("90s", generation, false);
};
