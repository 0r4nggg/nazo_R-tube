document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('createForm');
  const errorMsg = document.getElementById('errorMsg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';

    const username = form.username.value.trim();
    const channelName = form.channelName.value.trim();
    const iconUrl = form.iconUrl.value.trim();

    if (!username || !channelName) {
      errorMsg.textContent = 'ユーザー名とチャンネル名は必須です。';
      return;
    }

    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, channelName, iconUrl })
      });

      const data = await res.json();

      if (data.error) {
        errorMsg.textContent = data.error;
        return;
      }

      // 成功したらlocalStorageに保存してトップへ戻る
      localStorage.setItem('user', JSON.stringify(data));
      location.href = 'index.html';

    } catch (err) {
      errorMsg.textContent = '通信エラーが発生しました。';
      console.error(err);
    }
  });
});
