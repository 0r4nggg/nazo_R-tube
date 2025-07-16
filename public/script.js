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
  info.innerHTML = `
    <strong>${video.title}</strong><br>
    ${video.description}<br>
    投稿者: ${video.channelName}<br>
    再生数: ${video.viewCount}
  `;

  const commentBox = document.createElement('div');
  commentBox.className = 'comment-section';
  const commentForm = document.createElement('form');
  const commentInput = document.createElement('input');
  commentInput.placeholder = 'コメントを入力...';
  const commentBtn = document.createElement('button');
  commentBtn.textContent = '投稿';
  commentForm.append(commentInput, commentBtn);
  commentForm.onsubmit = async e => {
    e.preventDefault();
    await fetch(`/api/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userData._id, videoId: video._id, content: commentInput.value })
    });
    loadVideos();
  };
  commentBox.append(commentForm);

  // コメント表示
  if (video.comments) {
    video.comments.forEach(c => {
      const div = document.createElement('div');
      div.className = 'comment';
      div.innerHTML = `<p>${c.username}: ${c.content}</p>`;
      if (c.userId === userData?._id) {
        const del = document.createElement('span');
        del.textContent = '削除';
        del.className = 'comment-actions';
        del.onclick = async () => {
          await fetch(`/api/comment/${c._id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData._id })
          });
          loadVideos();
        };
        div.append(del);
      }
      commentBox.append(div);
    });
  }

  // 削除ボタン（ログインユーザーが投稿者の場合のみ表示）
  if (userData && video.userId === userData._id) {
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '削除';
    deleteBtn.className = 'delete-button';
    deleteBtn.onclick = async () => {
      const confirmed = confirm('この動画を本当に削除しますか？');
      if (!confirmed) return;

      const res = await fetch(`/api/video/${video._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData._id })
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

