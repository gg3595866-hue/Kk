const urlInput  = document.getElementById('app-url');
const saveBtn   = document.getElementById('save-btn');
const savedMsg  = document.getElementById('saved-msg');

// Load saved URL
chrome.storage.local.get(['appUrl'], (result) => {
  if (result.appUrl) urlInput.value = result.appUrl;
});

saveBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  chrome.storage.local.set({ appUrl: url }, () => {
    savedMsg.style.display = 'block';
    setTimeout(() => { savedMsg.style.display = 'none'; }, 2000);
  });
});
