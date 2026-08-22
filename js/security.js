/**
 * security.js - Protection ciblée uniquement contre les captures de contenu.
 * Ne bloque ni la navigation, ni le clic droit, ni le fonctionnement normal du site.
 */

(function () {
  let screenProtectActive = false;

  function isBlockedKey(event) {
    const key = (event.key || '').toLowerCase();
    const ctrlOrMeta = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;

    if (key === 'printscreen' || key === 'snapshot' || key === 'f12' || key === 'f11') return true;
    if (key === 'u' && ctrlOrMeta) return true;
    if (key === 's' && ctrlOrMeta) return true;
    if (key === 'p' && ctrlOrMeta) return true;
    if (key === 'r' && ctrlOrMeta) return true;
    if (key === 'c' && ctrlOrMeta && shift) return true;
    if (key === 'i' && ctrlOrMeta && shift) return true;
    if (key === 'j' && ctrlOrMeta && shift) return true;
    if (key === 'k' && ctrlOrMeta && shift) return true;
    return false;
  }

  function preventClipboardEvent(event) {
    if (!screenProtectActive) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function preventDevToolsKeys(event) {
    if (!screenProtectActive) return;
    if (isBlockedKey(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function attachCourseProtection() {
    document.addEventListener('copy', preventClipboardEvent, true);
    document.addEventListener('cut', preventClipboardEvent, true);
    document.addEventListener('keydown', preventDevToolsKeys, true);
  }

  function detachCourseProtection() {
    document.removeEventListener('copy', preventClipboardEvent, true);
    document.removeEventListener('cut', preventClipboardEvent, true);
    document.removeEventListener('keydown', preventDevToolsKeys, true);
  }

  window.ScreenProtect = {
    activate() {
      if (screenProtectActive) return;
      screenProtectActive = true;
      attachCourseProtection();
    },
    deactivate() {
      if (!screenProtectActive) return;
      screenProtectActive = false;
      detachCourseProtection();
    },
    isActive() {
      return screenProtectActive;
    }
  };
})();


