// Author: ecomcodelab.de (https://github.com/ecomcodeLab)

// Verhindert, dass das Script mehrmals auf der gleichen Seite geladen wird
if (window.webLupeInjected) {
  console.log("Web-Lupe bereits injiziert.");
} else {
  window.webLupeInjected = true;

  let lens = null;
  let isActive = false;
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let hasMouseMoved = false;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let currentImage = new Image();

  let config = {
    zoom: 2.0,
    size: 250,
    toggleKey: 'Alt+Z',
    colorKey: 'Alt+C'
  };

  chrome.storage.sync.get(['zoom', 'size', 'toggleKey', 'colorKey'], (res) => {
    if (res.zoom) config.zoom = parseFloat(res.zoom);
    if (res.size) config.size = parseInt(res.size);
    if (res.toggleKey) config.toggleKey = res.toggleKey.replace('Key', '');
    if (res.colorKey) config.colorKey = res.colorKey.replace('Key', '');
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.zoom) config.zoom = parseFloat(changes.zoom.newValue);
    if (changes.toggleKey) config.toggleKey = changes.toggleKey.newValue.replace('Key', '');
    if (changes.colorKey) config.colorKey = changes.colorKey.newValue.replace('Key', '');
    if (changes.size) {
      config.size = parseInt(changes.size.newValue);
      if (lens) {
        lens.style.width = `${config.size}px`;
        lens.style.height = `${config.size}px`;
        updatePosition();
      }
    }
  });

  function showToast(msg, duration = 2000) {
    let toast = document.getElementById('web-lupe-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'web-lupe-toast';
      Object.assign(toast.style, {
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '20px',
        zIndex: '2147483647',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        transition: 'opacity 0.3s'
      });
      document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    
    if (toast.timeout) clearTimeout(toast.timeout);
    if (duration > 0) {
      toast.timeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.style.display = 'none', 300);
      }, duration);
    }
  }

  function createLens() {
    // Falls noch eine alte Lupe (z.B. mit rotem Punkt) existiert -> komplett löschen!
    const oldLens = document.getElementById('chrome-extension-pro-lens');
    if (oldLens) oldLens.remove();

    lens = document.createElement('div');
    lens.id = 'chrome-extension-pro-lens';
    
    Object.assign(lens.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483647',
      borderRadius: '50%',
      border: '4px solid #fff',
      boxShadow: '0 0 20px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.2)',
      display: 'none',
      backgroundColor: '#fff',
      backgroundRepeat: 'no-repeat',
      overflow: 'hidden',
      boxSizing: 'border-box',
      cursor: 'none' // Mauszeiger auf der Lupe explizit deaktivieren
    });

    // Feines Kreuz (Vertikaler Strich)
    const crossVertical = document.createElement('div');
    Object.assign(crossVertical.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '2px',
      height: '14px',
      backgroundColor: '#000',
      transform: 'translate(-50%, -50%)',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.8)'
    });

    // Feines Kreuz (Horizontaler Strich)
    const crossHorizontal = document.createElement('div');
    Object.assign(crossHorizontal.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '14px',
      height: '2px',
      backgroundColor: '#000',
      transform: 'translate(-50%, -50%)',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.8)'
    });
    
    lens.appendChild(crossVertical);
    lens.appendChild(crossHorizontal);
    document.body.appendChild(lens);
  }

  function hideMouseCursor() {
    let style = document.getElementById('web-lupe-hide-cursor');
    if (!style) {
      style = document.createElement('style');
      style.id = 'web-lupe-hide-cursor';
      document.head.appendChild(style);
    }
    // Aggressives Verstecken auf allen Elementen
    style.innerHTML = 'html, body, *, button, a, input, textarea { cursor: none !important; }';
  }

  function restoreMouseCursor() {
    const style = document.getElementById('web-lupe-hide-cursor');
    if (style) style.remove();
  }

  function updatePosition() {
    if (!lens || !isActive) return;

    const radius = config.size / 2;
    const x = hasMouseMoved ? mouseX : window.innerWidth / 2;
    const y = hasMouseMoved ? mouseY : window.innerHeight / 2;
    
    lens.style.left = `${x - radius}px`;
    lens.style.top = `${y - radius}px`;

    const bgWidth = window.innerWidth * config.zoom;
    const bgHeight = window.innerHeight * config.zoom;

    lens.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;

    const bgX = radius - (x * config.zoom);
    const bgY = radius - (y * config.zoom);

    lens.style.backgroundPosition = `${bgX}px ${bgY}px`;
  }

  function activate() {
    if (isActive) return;
    createLens();
    showToast("Lupe lädt...", 0); 
    
    chrome.runtime.sendMessage({ action: "take_screenshot" }, (response) => {
      if (chrome.runtime.lastError) {
        showToast("Fehler: " + chrome.runtime.lastError.message, 4000);
        return;
      }
      if (!response || response.error) {
        showToast("Fehler: " + (response?.error || "Konnte Bild nicht aufnehmen."), 4000);
        return;
      }

      if (response.imgSrc) {
        isActive = true;
        hideMouseCursor(); // Mauszeiger unsichtbar machen
        
        lens.style.backgroundImage = `url(${response.imgSrc})`;
        lens.style.width = `${config.size}px`;
        lens.style.height = `${config.size}px`;
        lens.style.display = 'block';
        updatePosition();
        
        if (!hasMouseMoved) {
          showToast("Bewege die Maus!", 2000);
        } else {
          document.getElementById('web-lupe-toast').style.opacity = '0';
        }

        currentImage.onload = () => {
          canvas.width = currentImage.width;
          canvas.height = currentImage.height;
          ctx.drawImage(currentImage, 0, 0);
        };
        currentImage.src = response.imgSrc;
      }
    });
  }

  function deactivate() {
    isActive = false;
    restoreMouseCursor();
    if (lens) lens.style.display = 'none';
  }

  function copyColorToClipboard() {
    if (!isActive || !currentImage.width) return;

    const ratioX = currentImage.width / window.innerWidth;
    const ratioY = currentImage.height / window.innerHeight;
    
    const x = hasMouseMoved ? mouseX : window.innerWidth / 2;
    const y = hasMouseMoved ? mouseY : window.innerHeight / 2;

    const px = Math.round(x * ratioX);
    const py = Math.round(y * ratioY);

    const pixelData = ctx.getImageData(px, py, 1, 1).data;
    const hex = `#${((1 << 24) + (pixelData[0] << 16) + (pixelData[1] << 8) + pixelData[2]).toString(16).slice(1).toUpperCase()}`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(hex).then(() => showToast(`Farbe kopiert: ${hex}`));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = hex;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        showToast(`Farbe kopiert: ${hex}`);
      } catch (err) {
        showToast('Kopieren fehlgeschlagen');
      }
      textArea.remove();
    }
  }

  function getShortcutString(e) {
    let keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey) keys.push('Meta');
    
    const key = e.key.toUpperCase();
    if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key) && key.trim() !== '') {
      keys.push(key);
    }
    return keys.join('+');
  }

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    hasMouseMoved = true;
    if (isActive) updatePosition();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "toggle_lens") {
      if (isActive) deactivate();
      else activate();
    }
  });

  window.addEventListener('keydown', (e) => {
    // ESC-Taste zum Beenden
    if (e.key === 'Escape' && isActive) {
      e.preventDefault();
      deactivate();
      return;
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const pressedString = getShortcutString(e);
    
    if (pressedString === config.toggleKey && pressedString !== "") {
      e.preventDefault();
      if (isActive) deactivate();
      else activate();
    } else if (pressedString === config.colorKey && pressedString !== "") {
      e.preventDefault();
      if (isActive) copyColorToClipboard();
    }
  });

  window.addEventListener('scroll', () => {
    if (isActive) deactivate();
  }, { passive: true });
}