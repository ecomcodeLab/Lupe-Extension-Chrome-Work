// Author: ecomcodelab.de (https://github.com/ecomcodeLab)

function isAllowedUrl(url) {
  return url && !url.startsWith('chrome://') && !url.startsWith('edge://') && !url.startsWith('about:') && !url.startsWith('chrome-extension://');
}

chrome.action.onClicked.addListener(async (tab) => {
  // Wenn der Nutzer auf das Icon auf einer verbotenen Seite klickt:
  if (!isAllowedUrl(tab.url)) {
    chrome.action.setBadgeText({ text: "ERR", tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#FF0000", tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 2000);
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { action: "toggle_lens" });
  } catch (err) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    }).then(() => {
      chrome.tabs.sendMessage(tab.id, { action: "toggle_lens" }).catch(e => console.log(e));
    }).catch(e => console.error("Injection failed:", e));
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "take_screenshot") {
    if (!sender.tab || !isAllowedUrl(sender.tab.url)) {
      sendResponse({ error: "Diese URL wird von Chrome blockiert." });
      return false;
    }

    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ imgSrc: dataUrl });
      }
    });
    return true; 
  }
});