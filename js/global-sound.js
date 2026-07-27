(function () {
  if (window.__MysteriaGlobalSoundInitialized) return;
  window.__MysteriaGlobalSoundInitialized = true;

  const startedKey = 'Mysteria-global-sound-started';
  const positionKey = 'Mysteria-global-sound-position';
  let audioEl = null;
  let started = false;
  let attemptedAutoStart = false;
  const bucketName = 'videos';
  const filename = 'Harry Potter Ambient Music  Hogwarts  Relaxing, Studying, Sleeping.mp4';
  const pathParts = location.pathname.split('/');

  async function resolveStorageAudioUrl() {
    try {
      const storage = window.supabaseClient?.storage;
      if (!storage) return null;

      const { data: publicData, error: publicError } = storage.from(bucketName).getPublicUrl(filename);
      if (!publicError && publicData?.publicUrl) {
        return publicData.publicUrl;
      }

      const { data: signedData, error: signedError } = await storage.from(bucketName).createSignedUrl(filename, 60 * 60);
      if (!signedError && signedData?.signedUrl) {
        return signedData.signedUrl;
      }
    } catch (err) {
      console.warn('Impossible de récupérer l\'URL audio depuis Supabase storage :', err);
    }
    return null;
  }

  let audioSrc = (pathParts.includes('pages') ? '../' + filename : filename);

  async function initAudioSource() {
    const storageUrl = await resolveStorageAudioUrl();
    if (storageUrl) {
      audioSrc = storageUrl;
      audioEl && (audioEl.src = storageUrl);
    }
  }

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

  window.MysteriaGlobalSound = {
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

  window.addEventListener('load', async () => {
    await initAudioSource();
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

