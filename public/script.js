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
  console.log("ログイン状態:", loggedIn);

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

  // アップロードリンクの表示切り替え
  if (uploadLink) {
    uploadLink.onclick = () => {
      if (!loggedIn) {
        alert("動画をアップロードするにはログインが必要です。");
        return;
      }
      uploadSection.classList.toggle('hidden');
    };
  }

  // 動画一覧の読み込み
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

      // 自分の動画なら削除ボタンを表示
      if (loggedIn && userData._id === video.userId) {
        const delBtn = document.createElement('button');
        delBtn.textContent = '削除';
        delBtn.onclick = async () => {
          const confirmDel = confirm('本当に削除しますか？');
          if (!confirmDel) return;

          const res = await fetch(`/api/video/${video._id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (res.ok) {
            alert('削除しました');
            loadVideos();
          } else {
            alert('削除に失敗しました');
          }
        };
        container.appendChild(delBtn);
      }

      videoGrid.append(container);
    });
  }

  // 動画アップロード処理
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const file = document.getElementById('videoFile').files[0];
      const title = document.getElementById('titleInput').value;
      const description = document.getElementById('descInput').value;

      if (!file || !title) {
        return alert('動画ファイルとタイトルは必須です');
      }

      const formData = new FormData();
      formData.append('video', file);
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
        alert('アップロード成功');
        uploadSection.classList.add('hidden');
        loadVideos();
      } else {
        alert('アップロード失敗');
      }
    };
  }

  loadVideos();
});
