(function () {
  if (window.__MysteriaGlobalSoundInitialized) return;
  window.__MysteriaGlobalSoundInitialized = true;

  const videoId = 'rPt79QYxXEc';
  let player = null;
  let attemptedAutoStart = false;

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
        onReady: () => beginPlayback(),
        onStateChange: event => {
          if (event.data === window.YT.PlayerState.ENDED) player.playVideo();
        }
      }
    });
  }

  function beginPlayback() {
    if (attemptedAutoStart) return;
    attemptedAutoStart = true;
    if (!player) return;
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
      player?.playVideo();
    }
  };

  ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(eventName => {
    document.addEventListener(eventName, beginPlayback, { once: true, capture: true });
  });
  window.addEventListener('focus', beginPlayback);
  window.addEventListener('pageshow', beginPlayback);
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

