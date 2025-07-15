// script.js
const userId = localStorage.getItem('userId');
const videoGrid = document.getElementById('videoGrid');
const uploadForm = document.getElementById('uploadForm');
const uploadSection = document.getElementById('uploadSection');

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
      await fetch(`/api/comment/${video._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, text: commentInput.value })
      });
      loadVideos();
    };
    commentBox.append(commentForm);

    video.comments.forEach(c => {
      const div = document.createElement('div');
      div.className = 'comment';
      div.innerHTML = `<p>${c.username}: ${c.text}</p>`;
      if (c.userId === userId) {
        const del = document.createElement('span');
        del.textContent = '削除';
        del.className = 'comment-actions';
        del.onclick = async () => {
          await fetch(`/api/comment/${video._id}/${c._id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          });
          loadVideos();
        };
        div.append(del);
      }
      commentBox.append(div);
    });

    container.append(vid, info, commentBox);
    videoGrid.append(container);
  });
}

uploadForm.onsubmit = async e => {
  e.preventDefault();
  const form = new FormData(uploadForm);
  form.append('userId', userId);
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: form
  });
  if (res.ok) {
    uploadForm.reset();
    loadVideos();
  }
};

loadVideos();