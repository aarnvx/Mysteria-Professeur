(function () {
  if (window.__MysteriaGlobalSoundInitialized) return;
  window.__MysteriaGlobalSoundInitialized = true;

  const videoId = 'rPt79QYxXEc';
  const positionKey = 'Mysteria-global-youtube-position';
  let player = null;
  let attemptedAutoStart = false;

  function getStoredPosition() {
    const position = Number(sessionStorage.getItem(positionKey));
    return Number.isFinite(position) && position > 0 ? position : 0;
  }

  function savePosition() {
    if (!player || typeof player.getCurrentTime !== 'function') return;
    try {
      const position = player.getCurrentTime();
      if (Number.isFinite(position)) sessionStorage.setItem(positionKey, String(position));
    } catch (error) {
      // Ignore errors while navigating away from the page.
    }
  }

  function loadYouTubeApi() {
    if (window.YT?.Player) {
      createPlayer();
      return;
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady();
      createPlayer();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  }

  function createPlayer() {
    if (player || !window.YT?.Player) return;

    const container = document.createElement('div');
    container.id = 'mysteria-youtube-player';
    container.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;bottom:-10px;opacity:0;pointer-events:none;';
    document.body.appendChild(container);

    player = new window.YT.Player(container, {
      width: '1',
      height: '1',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        loop: 1,
        modestbranding: 1,
        playsinline: 1,
        playlist: videoId,
        rel: 0
      },
      events: {
        onReady: () => {
          const position = getStoredPosition();
          if (position > 0) player.seekTo(position, true);
          beginPlayback();
        },
        onStateChange: event => {
          if (event.data === window.YT.PlayerState.ENDED && typeof player?.playVideo === 'function') player.playVideo();
        }
      }
    });
  }

  function beginPlayback() {
    if (!player || typeof player.playVideo !== 'function') return;
    if (attemptedAutoStart) return;
    attemptedAutoStart = true;
    player.playVideo();
    try {
      localStorage.setItem('Mysteria-global-sound-started', '1');
    } catch (error) {
      // Ignore storage errors.
    }
  }

  window.MysteriaGlobalSound = {
    pauseForTransition() {
      player?.pauseVideo();
    },
    resumeAfterTransition() {
      if (typeof player?.playVideo === 'function') player.playVideo();
    }
  };

  ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(eventName => {
    document.addEventListener(eventName, beginPlayback, { once: true, capture: true });
  });
  window.addEventListener('focus', beginPlayback);
  window.addEventListener('pageshow', beginPlayback);
  window.addEventListener('beforeunload', savePosition);
  window.addEventListener('load', loadYouTubeApi);

  function attachSlideLinks() {
    const links = Array.from(document.querySelectorAll('a[href]')).filter(link => {
      return link.origin === location.origin && !link.hasAttribute('download') && !link.href.includes('#');
    });

    links.forEach(link => {
      link.addEventListener('click', event => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
        event.preventDefault();
        document.documentElement.classList.remove('page-transition-active');
        document.documentElement.classList.add('page-transition-exit');
        setTimeout(() => {
          window.location.href = href;
        }, 260);
      });
    });
  }

  attachSlideLinks();
})();

