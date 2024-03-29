const saveOptions = () => {
  const APIKey = document.getElementById('APIKey').value;
  const Model = document.getElementById('Model').value;

  chrome.storage.sync.set(
    { APIKey: APIKey, Model: Model },
    () => {
      const status = document.getElementById('status');
      status.textContent = '保存しました';
    }
  );
};

const restoreOptions = () => {
  chrome.storage.sync.get(
    { APIKey: '', Model: 'gpt-3.5-turbo' },
    (items) => {
      document.getElementById('APIKey').value = items.APIKey;
      document.getElementById('Model').value = items.Model;
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
