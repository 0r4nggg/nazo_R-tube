document.addEventListener('DOMContentLoaded', () => {
  const videoGrid = document.getElementById('videoGrid');
  const uploadSection = document.getElementById('uploadSection');
  const uploadLink = document.getElementById('uploadLink');
  const authLink = document.getElementById('authLink');

  // ユーザー情報の取得
  const userDataRaw = localStorage.getItem('user');
  let userData = null;
  try {
    userData = JSON.parse(userDataRaw);
  } catch {
    userData = null;
  }
  const loggedIn = !!userData;

  // authLinkの表示・動作切り替え
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

  // アップロードボタン表示切り替え
  if (uploadLink) {
    uploadLink.onclick = () => {
      if (!loggedIn) {
        alert('動画のアップロードにはログインが必要です。');
        return;
      }
      uploadSection.classList.toggle('hidden');
    };
  }

  // 動画一覧を読み込み表示する関数
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
      info.innerHTML = `<strong>${video.title}</strong><br>${video.description}<br>投稿者: ${video.channelName}<br>再生数: ${video.viewCount}`;

      container.append(vid, info);
      videoGrid.append(container);
    });
  }

  loadVideos();

  // アップロード処理
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const videoFile = document.getElementById('videoFile').files[0];
      const title = document.getElementById('titleInput').value.trim();
      const description = document.getElementById('descInput').value.trim();

      if (!videoFile) {
        alert('動画ファイルを選択してください');
        return;
      }
      if (!title) {
        alert('タイトルを入力してください');
        return;
      }

      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('userId', userData._id);

      const res = await fetch('/api/upload-video', {
        method: 'POST',
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
        alert('アップロードに失敗しました');
      }
    };
  }
});

