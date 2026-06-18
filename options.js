const zoomInp = document.getElementById('zoom');
const sizeInp = document.getElementById('size');
const zoomTxt = document.getElementById('zoom-text');
const sizeTxt = document.getElementById('size-text');
const toggleKeyInp = document.getElementById('toggleKey');
const colorKeyInp = document.getElementById('colorKey');
const statusMsg = document.getElementById('status');

chrome.storage.sync.get(['zoom', 'size', 'toggleKey', 'colorKey'], (res) => {
  if (res.zoom) {
    zoomInp.value = res.zoom;
    zoomTxt.innerText = parseFloat(res.zoom).toFixed(1) + 'x';
  }
  if (res.size) {
    sizeInp.value = res.size;
    sizeTxt.innerText = res.size + 'px';
  }
  // Alte Formate "Alt+KeyZ" zu "Alt+Z" aufräumen
  if (res.toggleKey) toggleKeyInp.value = res.toggleKey.replace('Key', '');
  else toggleKeyInp.value = 'Alt+Z'; 
  
  if (res.colorKey) colorKeyInp.value = res.colorKey.replace('Key', '');
  else colorKeyInp.value = 'Alt+C'; 
});

let timeout;
const save = () => {
  const zoom = zoomInp.value;
  const size = sizeInp.value;
  const toggleKey = toggleKeyInp.value;
  const colorKey = colorKeyInp.value;
  
  zoomTxt.innerText = parseFloat(zoom).toFixed(1) + 'x';
  sizeTxt.innerText = size + 'px';

  chrome.storage.sync.set({ zoom, size, toggleKey, colorKey }, () => {
    statusMsg.style.opacity = '1';
    clearTimeout(timeout);
    timeout = setTimeout(() => { statusMsg.style.opacity = '0'; }, 2000);
  });
};

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

function recordKey(e) {
  e.preventDefault();
  if (e.key === "Backspace" || e.key === "Delete") {
    e.target.value = "";
    save();
    return;
  }
  
  const shortcut = getShortcutString(e);
  if (shortcut) {
    e.target.value = shortcut;
    save();
  }
}

zoomInp.addEventListener('input', save);
sizeInp.addEventListener('input', save);

toggleKeyInp.addEventListener('keydown', recordKey);
colorKeyInp.addEventListener('keydown', recordKey);

toggleKeyInp.addEventListener('focus', (e) => e.target.style.background = '#e7f3ff');
toggleKeyInp.addEventListener('blur', (e) => e.target.style.background = '#f9f9f9');
colorKeyInp.addEventListener('focus', (e) => e.target.style.background = '#e7f3ff');
colorKeyInp.addEventListener('blur', (e) => e.target.style.background = '#f9f9f9');