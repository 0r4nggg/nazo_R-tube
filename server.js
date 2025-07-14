const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// アップロード先ディレクトリ
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// multer設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // ファイル名はタイムスタンプ+元ファイル名
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// 動画情報をメモリで管理（簡易DB）
let videos = [];
let nextId = 1;

app.use(express.json());
app.use(express.static('public')); // フロントのファイルをpublicに置く想定
app.use('/uploads', express.static(UPLOAD_DIR)); // 動画ファイルの配信

// 動画アップロードAPI
app.post('/api/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '動画ファイルがありません' });
  }
  const { title, description } = req.body;
  const date = new Date().toLocaleString('ja-JP', { year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit' });

  const video = {
    id: nextId++,
    title: title || '無題の動画',
    description: description || '(説明なし)',
    date,
    filename: req.file.filename,
    viewCount: 0
  };
  videos.unshift(video);
  res.json({ videoId: video.id });
});

// 動画一覧取得API
app.get('/api/videos', (req, res) => {
  // ファイルパスをURLに変換して返す
  const videoList = videos.map(v => ({
    id: v.id,
    title: v.title,
    description: v.description,
    date: v.date,
    viewCount: v.viewCount,
    url: `/uploads/${v.filename}`
  }));
  res.json(videoList);
});

// 視聴回数更新API
app.post('/api/increment-viewcount/:id', (req, res) => {
  const id = Number(req.params.id);
  const video = videos.find(v => v.id === id);
  if (!video) return res.status(404).json({ error: '動画が見つかりません' });

  video.viewCount++;
  res.json({ viewCount: video.viewCount });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
