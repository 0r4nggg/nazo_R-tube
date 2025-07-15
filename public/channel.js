// channel.js
const userId = localStorage.getItem('userId');
const channelForm = document.getElementById('channelForm');
const deleteBtn = document.getElementById('deleteAccountBtn');
const usernameInput = document.getElementById('username');
const channelNameInput = document.getElementById('channelName');
const iconUrlInput = document.getElementById('iconUrl');

async function loadAccountInfo() {
  const res = await fetch(`/api/user/${userId}`);
  if (!res.ok) return alert('ユーザー情報の取得に失敗しました');
  const user = await res.json();
  usernameInput.value = user.username;
  channelNameInput.value = user.channelName;
  iconUrlInput.value = user.iconUrl;
}

channelForm.onsubmit = async e => {
  e.preventDefault();
  const data = {
    username: usernameInput.value,
    channelName: channelNameInput.value,
    iconUrl: iconUrlInput.value,
    userId
  };
  const res = await fetch(`/api/user/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (res.ok) alert('更新完了');
};

deleteBtn.onclick = async () => {
  const confirmDelete = confirm('アカウントを本当に削除しますか？この操作は元に戻せません。');
  if (!confirmDelete) return;

  const res = await fetch(`/api/user/${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  if (res.ok) {
    localStorage.removeItem('userId');
    alert('アカウントを削除しました');
    window.location.href = '/';
  }
};

loadAccountInfo();
