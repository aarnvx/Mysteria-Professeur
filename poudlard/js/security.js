/**
 * security.js - Protection anti-copie et anti-screenshot
 */

(function() {
    // 1. Désactiver le clic droit
    document.addEventListener('contextmenu', event => event.preventDefault());

    // 2. Désactiver les raccourcis clavier de copie et d'inspection
    document.addEventListener('keydown', (e) => {
        // Bloquer Ctrl+C, Ctrl+X, Ctrl+U, Ctrl+P, Ctrl+S (mais autoriser Ctrl+V et Ctrl+A pour les formulaires)
        if (e.ctrlKey || e.metaKey) {
            const blockedKeys = ['c', 'x', 'u', 'p', 's'];
            if (blockedKeys.includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        }
        // Bloquer F12 (Outils de dev)
        if (e.key === 'F12') {
            e.preventDefault();
        }
        // Bloquer PrintScreen
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            triggerAntiScreen();
        }
    });

    // 3. Protection "Écran noir" type Netflix lors d'une capture (basé sur la perte de focus)
    // De nombreux outils de capture (Snipping Tool, outil Mac) font perdre le focus à la page.
    
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'black';
    overlay.style.color = 'red';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.fontSize = '2rem';
    overlay.style.fontFamily = 'Cinzel, serif';
    overlay.style.zIndex = '999999';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.transition = 'opacity 0.1s';
    overlay.innerText = '⚠️ CAPTURE D\'ÉCRAN INTERDITE ⚠️';
    document.body.appendChild(overlay);

    function triggerAntiScreen() {
        overlay.style.opacity = '1';
        // Vider le presse-papier si possible
        if (navigator.clipboard) {
            navigator.clipboard.writeText('Contenu protégé - Poudlard RP').catch(()=>({}));
        }
    }

    function removeAntiScreen() {
        overlay.style.opacity = '0';
    }

    // Activer/Désactiver la protection selon le contexte (appelé par les pages)
    window.ScreenProtect = {
      activate() {
        window.addEventListener('blur', triggerAntiScreen);
        window.addEventListener('focus', removeAntiScreen);
        document.addEventListener('mouseleave', triggerAntiScreen);
        document.addEventListener('mouseenter', removeAntiScreen);
      },
      deactivate() {
        window.removeEventListener('blur', triggerAntiScreen);
        window.removeEventListener('focus', removeAntiScreen);
        document.removeEventListener('mouseleave', triggerAntiScreen);
        document.removeEventListener('mouseenter', removeAntiScreen);
        removeAntiScreen();
      }
    };

})();

