/*
  Bus Wali Playlist — final YouTube implementation.

  Key differences from previous attempts:
  1. The embedded YouTube player is a real, visible 320x200+ player.
  2. A valid bootstrap video is supplied to YT.Player, avoiding an
     "Invalid YouTube request" during player construction.
  3. Once ready, the requested playlist is cued with cuePlaylist().
  4. Clicking a mode uses loadPlaylist() on the same ready player.
  5. A generation token prevents stale mode callbacks.
*/

const PLAYLISTS = Object.freeze({
  "90s": { title:"90s Mode", description:"Evergreen Bollywood", id:"PLMRKdK25AuPVjHl9Kdb-gkBy0Cm7Zi2xo" },
  "new": { title:"New Mode", description:"Recent Hindi favourites", id:"PLO7-VO1D0_6MnOoKQGmYNY2OoCOP3GRfm" },
  "bhojpuri": { title:"Bhojpuri Mode", description:"Desi hits for the road", id:"PLczcjlYw3G_-x_-e3HhXWuB72811jN2zh" }
});

const BOOTSTRAP_VIDEO = "M7lc1UVf-VE";
let player = null;
let ready = false;
let mode = "90s";
let generation = 0;
let timer = null;

const $ = id => document.getElementById(id);
const cards = [...document.querySelectorAll(".mode")];

function timeText(n){
  if(!Number.isFinite(n)||n<0)return "0:00";
  return `${Math.floor(n/60)}:${Math.floor(n%60).toString().padStart(2,"0")}`;
}
function setModeUI(m,status){
  mode=m;
  $("title").textContent=PLAYLISTS[m].title;
  $("status").textContent=status;
  cards.forEach(c=>{
    const a=c.dataset.mode===m;
    c.classList.toggle("active",a);
    c.setAttribute("aria-pressed",String(a));
  });
}
function setPlaying(v){
  $("icon").textContent=v?"Ⅱ":"▶";
  $("play").setAttribute("aria-label",v?"Pause":"Play");
  $("eq").classList.toggle("playing",v);
}
function setButtons(v){
  $("play").disabled=!v;$("prev").disabled=!v;$("next").disabled=!v;
}
function resetProgress(){
  $("current").textContent="0:00";$("total").textContent="0:00";$("fill").style.width="0%";
}
function stopTimer(){if(timer)clearInterval(timer);timer=null}
function startTimer(){
  stopTimer();
  timer=setInterval(()=>{
    if(!player||!ready)return;
    const d=Number(player.getDuration?.()||0),c=Number(player.getCurrentTime?.()||0);
    $("current").textContent=timeText(c);$("total").textContent=timeText(d);
    $("fill").style.width=d?`${Math.min(100,Math.max(0,c/d*100))}%`:"0%";
  },500);
}

function cuePlaylist(m, autoplay){
  if(!player||!ready)return;
  const id=PLAYLISTS[m].id;
  try{
    if(autoplay){
      // loadPlaylist is documented to load AND play the supplied playlist.
      player.loadPlaylist({listType:"playlist",list:id,index:0,startSeconds:0});
    }else{
      player.cuePlaylist({listType:"playlist",list:id,index:0,startSeconds:0});
    }
  }catch(err){
    console.error(err);
    $("status").textContent="Could not load this playlist.";
  }
}

function switchMode(m){
  if(!PLAYLISTS[m]||!ready)return;
  generation++;
  const token=generation;
  setModeUI(m,"Loading playlist…");
  setPlaying(false);stopTimer();resetProgress();

  cuePlaylist(m,true);

  // The player events below are associated with the same player, so
  // an old player cannot accidentally keep controlling a new one.
  setTimeout(()=>{
    if(token===generation && mode===m && player){
      $("status").textContent="Playing";
    }
  },800);
}

function onReady(event){
  player=event.target;ready=true;
  $("videoLoading").classList.add("hidden");
  setButtons(true);

  // Cue the default playlist without autoplay on first page load.
  cuePlaylist("90s",false);
  setModeUI("90s","Ready to start");
}

function onStateChange(event){
  if(!player)return;
  const s=event.data;
  if(s===YT.PlayerState.PLAYING){
    setPlaying(true);$("status").textContent="Playing";startTimer();
  }else if(s===YT.PlayerState.PAUSED){
    setPlaying(false);$("status").textContent="Paused";stopTimer();
  }else if(s===YT.PlayerState.BUFFERING){
    $("status").textContent="Buffering…";
  }else if(s===YT.PlayerState.CUED){
    setPlaying(false);
    if($("status").textContent!=="Loading playlist…")$("status").textContent="Ready to start";
    stopTimer();
  }else if(s===YT.PlayerState.ENDED){
    setPlaying(false);$("status").textContent="Playlist ended";stopTimer();
  }
}

function onError(event){
  setPlaying(false);stopTimer();setButtons(false);
  const messages={
    2:"Invalid YouTube request. The playlist may be unavailable for embedding.",
    5:"YouTube HTML5 player error.",
    100:"A video in this playlist is unavailable or private.",
    101:"YouTube does not allow this video to be embedded.",
    150:"YouTube does not allow this video to be embedded."
  };
  $("status").textContent=messages[event.data]||`YouTube error (${event.data})`;
  console.error("YouTube player error:",event.data,PLAYLISTS[mode].id);
}

cards.forEach(card=>card.addEventListener("click",()=>switchMode(card.dataset.mode)));

$("play").addEventListener("click",()=>{
  if(!player||!ready)return;
  if(player.getPlayerState()===YT.PlayerState.PLAYING)player.pauseVideo();
  else player.playVideo();
});
$("prev").addEventListener("click",()=>{if(player&&ready)player.previousVideo()});
$("next").addEventListener("click",()=>{if(player&&ready)player.nextVideo()});

document.addEventListener("keydown",e=>{
  if(e.target.matches("input,textarea,select"))return;
  if(e.code==="Space"){e.preventDefault();$("play").click()}
  else if(e.code==="ArrowLeft"&&ready)player.previousVideo();
  else if(e.code==="ArrowRight"&&ready)player.nextVideo();
});

window.onYouTubeIframeAPIReady=()=>{
  player=new YT.Player("youtube-player",{
    width:"100%",
    height:"100%",
    videoId:BOOTSTRAP_VIDEO,
    playerVars:{
      autoplay:0,
      controls:0,
      disablekb:1,
      fs:0,
      playsinline:1,
      rel:0,
      origin:window.location.origin
    },
    events:{
      onReady:onReady,
      onStateChange:onStateChange,
      onError:onError,
      onAutoplayBlocked:()=>{$("status").textContent="Tap play if your browser blocked autoplay."}
    }
  });
};
