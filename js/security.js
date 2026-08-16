/**
 * security.js - Protection anti-copie et anti-capture d'écran
 * Version légère : activée uniquement pendant la lecture d'un cours,
 * sans bloquer la navigation entre les pages.
 */

(function() {
    let screenProtectActive = false;
    let screenProtectWatcher = null;

    function isBlockedKey(e) {
      const key = (e.key || '').toLowerCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (key === 'printscreen' || key === 'snapshot' || key === 'f12' || key === 'f11') return true;
      if (key === 'u' && ctrlOrMeta) return true;
      if (key === 'i' && ctrlOrMeta && shift) return true;
      if (key === 'j' && ctrlOrMeta && shift) return true;
      if (key === 'k' && ctrlOrMeta && shift) return true;
      if (key === 'c' && ctrlOrMeta && shift) return true;
      if (key === 's' && ctrlOrMeta) return true;
      if (key === 'p' && ctrlOrMeta) return true;
      if (key === 'r' && ctrlOrMeta) return true;
      return false;
    }

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.95)';
    overlay.style.color = '#f0c36d';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.fontSize = '2rem';
    overlay.style.fontFamily = 'Cinzel, serif';
    overlay.style.zIndex = '999999';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.transition = 'opacity 0.2s ease';
    overlay.innerText = "⚠️ CAPTURE D'ÉCRAN INTERDITE ⚠️";
    document.body.appendChild(overlay);

    function triggerAntiScreen() {
      if (!screenProtectActive) return;
      overlay.style.opacity = '1';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('Contenu protégé - Mysteria RP').catch(() => {});
        }
      } catch (err) {}
    }

    function removeAntiScreen() {
      overlay.style.opacity = '0';
    }

    function startScreenProtectWatcher() {
      if (screenProtectWatcher) return;
      screenProtectWatcher = setInterval(() => {
        if (!screenProtectActive) return;
        if (document.hidden || !document.hasFocus()) {
          triggerAntiScreen();
        }
      }, 500);
    }

    function stopScreenProtectWatcher() {
      if (!screenProtectWatcher) return;
      clearInterval(screenProtectWatcher);
      screenProtectWatcher = null;
    }

    function preventClipboardEvent(event) {
      if (!screenProtectActive) return;
      event.preventDefault();
      event.stopPropagation();
      triggerAntiScreen();
    }

    function preventDevToolsKeys(event) {
      if (!screenProtectActive) return;
      if (isBlockedKey(event)) {
        event.preventDefault();
        event.stopPropagation();
        triggerAntiScreen();
      }
    }

    function attachCourseProtection() {
      window.addEventListener('blur', triggerAntiScreen);
      window.addEventListener('focus', removeAntiScreen);
      document.addEventListener('visibilitychange', () => {
        if (!screenProtectActive) return;
        if (document.hidden) triggerAntiScreen();
        else removeAntiScreen();
      });
      document.addEventListener('copy', preventClipboardEvent, true);
      document.addEventListener('cut', preventClipboardEvent, true);
      document.addEventListener('keydown', preventDevToolsKeys, true);
      startScreenProtectWatcher();
    }

    function detachCourseProtection() {
      window.removeEventListener('blur', triggerAntiScreen);
      window.removeEventListener('focus', removeAntiScreen);
      document.removeEventListener('visibilitychange', triggerAntiScreen);
      document.removeEventListener('copy', preventClipboardEvent, true);
      document.removeEventListener('cut', preventClipboardEvent, true);
      document.removeEventListener('keydown', preventDevToolsKeys, true);
      stopScreenProtectWatcher();
      removeAntiScreen();
    }

    window.ScreenProtect = {
      activate() {
        if (screenProtectActive) return;
        screenProtectActive = true;
        attachCourseProtection();
        triggerAntiScreen();
      },
      deactivate() {
        if (!screenProtectActive) return;
        screenProtectActive = false;
        detachCourseProtection();
      }
    };

    if (window.location.pathname.includes('courses.html')) {
      document.addEventListener('contextmenu', (event) => event.preventDefault());
    }
})();


