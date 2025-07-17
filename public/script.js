document.addEventListener('DOMContentLoaded', () => {
  const videoGrid = document.getElementById('videoGrid');
  const uploadSection = document.getElementById('uploadSection');
  const uploadLink = document.getElementById('uploadLink');
  const authLink = document.getElementById('authLink');
  const submitBtn = document.getElementById('submitBtn');

  // localStorageからユーザーとトークン取得
  const userDataRaw = localStorage.getItem('user');
  let userData = null;
  let token = null;

  try {
    userData = JSON.parse(userDataRaw);
    token = userData?.token || null;
  } catch {
    userData = null;
    token = null;
  }

  const loggedIn = !!userData && !!token;

  // 認証リンク表示切り替え
  if (authLink) {
    if (loggedIn) {
      authLink.textContent = 'チャンネル設定';
      authLink.onclick = () => {
        window.location.href = 'channel.html';
      };
    } else {
      authLink.textContent = 'ログイン / アカウント作成';
      authLink.onclick = () => {
        window.location.href = 'login.html';
      };
    }
  }

  // アップロード表示切り替え
  if (uploadLink) {
    uploadLink.onclick = () => {
      if (!loggedIn) {
        alert('動画のアップロードにはログインが必要です。');
        return;
      }
      uploadSection.classList.toggle('hidden');
    };
  }

  // アップロード処理
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const videoFile = document.getElementById('videoFile').files[0];
      const title = document.getElementById('titleInput').value.trim();
      const description = document.getElementById('descInput').value.trim();

      if (!loggedIn) return alert('ログインしてください');
      if (!videoFile || !title) return alert('必要項目を入力してください');

      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', title);
      formData.append('description', description);

      const res = await fetch('/api/upload-video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        alert('アップロード成功！');
        document.getElementById('videoFile').value = '';
        document.getElementById('titleInput').value = '';
        document.getElementById('descInput').value = '';
        uploadSection.classList.add('hidden');
        loadVideos();
      } else {
        alert('アップロード失敗');
      }
    };
  }

  // 動画一覧読み込み
  async function loadVideos() {
    const res = await fetch('/api/videos');
    const videos = await res.json();

    videoGrid.innerHTML = '';

    videos.forEach(video => {
      const container = document.createElement('div');
      container.className = 'video-container';

      const vid = document.createElement('video');
      vid.src = video.url;
      vid.controls = true;

      const info = document.createElement('div');
      info.className = 'video-info';
      info.innerHTML = `
        <strong>${video.title}</strong><br>
        ${video.description}<br>
        投稿者: ${video.channelName}<br>
        再生数: ${video.viewCount}
      `;

      const commentBox = document.createElement('div');
      commentBox.className = 'comment-section';

      // 削除ボタン（自分の投稿のみ表示）
      if (loggedIn && userData._id === video.userId) {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '削除';
        deleteBtn.className = 'delete-button';
        deleteBtn.onclick = async () => {
          const confirmed = confirm('本当に削除しますか？');
          if (!confirmed) return;

          const res = await fetch(`/api/video/${video._id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          });

          if (res.ok) {
            alert('削除しました');
            loadVideos();
          } else {
            alert('削除に失敗しました');
          }
        };
        container.appendChild(deleteBtn);
      }

      container.append(vid, info, commentBox);
      videoGrid.append(container);
    });
  }

  loadVideos();
});
