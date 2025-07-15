document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';

    const username = form.username.value.trim();
    const channelName = form.channelName.value.trim();

    if (!username || !channelName) {
      errorMsg.textContent = 'ユーザー名とチャンネル名は必須です。';
      return;
    }

    try {
      // まずはユーザー一覧を取得して存在チェック
      const res = await fetch('/api/users'); // ※ このAPIはサーバー側で用意が必要です
      if (!res.ok) throw new Error('ユーザー一覧取得に失敗しました');

      const users = await res.json();
      const user = users.find(u => u.username === username && u.channelName === channelName);

      if (!user) {
        errorMsg.textContent = 'ユーザーが見つかりません。アカウント作成してください。';
        return;
      }

      // ログイン成功 → localStorageに保存してトップに戻る
      localStorage.setItem('user', JSON.stringify(user));
      location.href = 'index.html';

    } catch (err) {
      errorMsg.textContent = '通信エラーが発生しました。';
      console.error(err);
    }
  });
});
