(function () {
  if (window.__poudlardGlobalSoundInitialized) return;
  window.__poudlardGlobalSoundInitialized = true;

  const startedKey = 'poudlard-global-sound-started';
  const positionKey = 'poudlard-global-sound-position';
  let audioEl = null;
  let started = false;
  let attemptedAutoStart = false;
  const filename = 'Harry Potter Ambient Music  Hogwarts  Relaxing, Studying, Sleeping.mp4';
  const pathParts = location.pathname.split('/');
  const audioSrc = pathParts.includes('pages') ? '../' + filename : filename;

  function getStoredPosition() {
    const stored = sessionStorage.getItem(positionKey);
    if (!stored) return 0;
    const value = parseFloat(stored);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function savePosition() {
    if (!audioEl || isNaN(audioEl.currentTime)) return;
    try {
      sessionStorage.setItem(positionKey, audioEl.currentTime.toString());
    } catch (error) {
      // ignore storage errors
    }
  }

  function createAudioElement() {
    if (audioEl) return audioEl;
    audioEl = document.createElement('audio');
    audioEl.src = audioSrc;
    audioEl.loop = true;
    audioEl.preload = 'auto';
    audioEl.autoplay = true;
    audioEl.volume = 0.35;
    audioEl.setAttribute('playsinline', '');
    audioEl.style.display = 'none';

    const position = getStoredPosition();
    if (position > 0) {
      audioEl.currentTime = position;
    }

    audioEl.addEventListener('canplaythrough', () => {
      if (!started) {
        tryStartPlayback();
      }
    });

    audioEl.addEventListener('timeupdate', savePosition);
    window.addEventListener('beforeunload', savePosition);

    document.body.appendChild(audioEl);
    return audioEl;
  }

  function tryStoreStarted() {
    try {
      localStorage.setItem(startedKey, '1');
    } catch (error) {
      console.warn('Impossible d’écrire dans localStorage pour le son global.', error);
    }
  }

  function tryStartPlayback() {
    if (started) return;
    const audio = createAudioElement();
    const playPromise = audio.play();

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          started = true;
          tryStoreStarted();
        })
        .catch(() => {
          if (!started) {
            audio.muted = false;
          }
        });
    } else {
      started = true;
      tryStoreStarted();
    }
  }

  function beginPlayback() {
    if (attemptedAutoStart) return;
    attemptedAutoStart = true;
    tryStartPlayback();
  }

  window.PoudlardGlobalSound = {
    pauseForTransition() {
      if (audioEl && !audioEl.paused) {
        audioEl.pause();
      }
    },
    resumeAfterTransition() {
      if (audioEl && audioEl.paused) {
        const playPromise = audioEl.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(() => {
            // Ignore failure, user can resume later.
          });
        }
      }
    }
  };

  ['click', 'touchstart', 'keydown', 'pointerdown'].forEach((eventName) => {
    document.addEventListener(eventName, beginPlayback, { once: true, capture: true });
  });

  window.addEventListener('focus', beginPlayback);
  window.addEventListener('pageshow', beginPlayback);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !started) {
      beginPlayback();
    }
  });

  window.addEventListener('load', () => {
    createAudioElement();
    document.documentElement.classList.add('page-transition-active');
    if (localStorage.getItem(startedKey) === '1') {
      window.setTimeout(beginPlayback, 150);
    } else {
      window.setTimeout(beginPlayback, 250);
    }
  });

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
