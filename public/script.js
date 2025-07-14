const videoFile = document.getElementById('videoFile');
const titleInput = document.getElementById('titleInput');
const descInput = document.getElementById('descInput');
const submitBtn = document.getElementById('submitBtn');
const videoGrid = document.getElementById('videoGrid');

// サーバーAPIのURL（同じドメイン想定）
const API_UPLOAD = '/api/upload-video';
const API_LIST = '/api/videos';
const API_VIEWCOUNT = '/api/increment-viewcount';

submitBtn.addEventListener('click', async () => {
  if (!videoFile.files[0]) {
    alert('動画ファイルを選択してください');
    return;
  }

  const formData = new FormData();
  formData.append('video', videoFile.files[0]);
  formData.append('title', titleInput.value || '無題の動画');
  formData.append('description', descInput.value || '(説明なし)');

  try {
    const res = await fetch(API_UPLOAD, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('アップロード失敗');
    await loadVideos();

    // 投稿後リセット
    videoFile.value = '';
    titleInput.value = '';
    descInput.value = '';
    alert('動画をアップロードしました');
  } catch (e) {
    alert('アップロード中にエラーが発生しました');
    console.error(e);
  }
});

// 動画一覧を取得して表示
async function loadVideos() {
  try {
    const res = await fetch(API_LIST);
    if (!res.ok) throw new Error('動画一覧取得失敗');
    const videos = await res.json();

    videoGrid.innerHTML = '';
    videos.forEach(video => {
      const container = document.createElement('div');
      container.classList.add('video-container');

      const videoEl = document.createElement('video');
      videoEl.src = video.url;
      videoEl.controls = true;

      const viewCount = document.createElement('p');
      viewCount.textContent = `視聴回数：${video.viewCount} 回`;

      videoEl.addEventListener('play', async () => {
        // 視聴回数をサーバーに通知し更新
        try {
          const res = await fetch(`${API_VIEWCOUNT}/${video.id}`, { method: 'POST' });
          if (!res.ok) throw new Error('視聴回数更新失敗');
          const data = await res.json();
          viewCount.textContent = `視聴回数：${data.viewCount} 回`;
        } catch (e) {
          console.error(e);
        }
      });

      const info = document.createElement('div');
      info.classList.add('video-info');
      info.innerHTML = `
        <strong>${video.title}</strong><br>
        ${video.description}<br>
        アップロード日時：${video.date}<br>
      `;
      info.appendChild(viewCount);

      container.appendChild(videoEl);
      container.appendChild(info);

      videoGrid.appendChild(container);
    });
  } catch (e) {
    console.error('動画一覧読み込みエラー', e);
  }
}

// ページ読み込み時に動画一覧を表示
window.addEventListener('load', loadVideos);
