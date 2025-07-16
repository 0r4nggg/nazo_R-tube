require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Cloudinary } = require('cloudinary').v2;
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cloudinary設定
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary動画削除関数
function extractCloudinaryPublicId(url) {
  const match = url.match(/\/upload\/(?:v\d+\/)?([^\.\/]+)\./);
  return match ? match[1] : null;
}

// MongoDB接続
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// スキーマ定義
const UserSchema = new mongoose.Schema({
  username: String,
  channelName: String,
  iconUrl: String,
  ip: String
});

const VideoSchema = new mongoose.Schema({
  title: String,
  description: String,
  url: String,
  date: String,
  viewCount: Number,
  userId: mongoose.Schema.Types.ObjectId
});

const CommentSchema = new mongoose.Schema({
  videoId: mongoose.Schema.Types.ObjectId,
  userId: mongoose.Schema.Types.ObjectId,
  content: String,
  date: String
});

const User = mongoose.model('User', UserSchema);
const Video = mongoose.model('Video', VideoSchema);
const Comment = mongoose.model('Comment', CommentSchema);

// IP取得
function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress;
}

// メモリに一時保存（Cloudinaryに送信するだけなので十分）
const storage = multer.memoryStorage();
const upload = multer({ storage });

// アカウント作成
app.post('/api/create-user', async (req, res) => {
  const ip = getClientIp(req);
  const exist = await User.findOne({ ip });
  if (exist) return res.status(403).json({ error: 'このIPからは既に作成済みです' });

  const user = new User({ ...req.body, ip });
  await user.save();
  res.json(user);
});

// アカウント取得・更新・削除
app.get('/api/user/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  res.json(user);
});

app.put('/api/user/:id', async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

app.delete('/api/user/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  await Video.deleteMany({ userId: req.params.id });
  await Comment.deleteMany({ userId: req.params.id });
  res.json({ success: true });
});

// 動画アップロード（Cloudinary経由）
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  const { title, description, userId } = req.body;
  if (!req.file) return res.status(400).json({ error: '動画がありません' });

  try {
    const uploadResult = await cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'nazo_r_tube_videos'
      },
      async (error, result) => {
        if (error) return res.status(500).json({ error: 'Cloudinaryアップロード失敗' });

        const video = new Video({
          title,
          description,
          url: result.secure_url,
          date: new Date().toLocaleString('ja-JP'),
          viewCount: 0,
          userId
        });

        await video.save();
        res.json({ videoId: video._id });
      }
    );

    // streamに書き込む
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);
    bufferStream.pipe(uploadResult);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '動画アップロード失敗' });
  }
});

// 動画取得
app.get('/api/videos', async (req, res) => {
  const videos = await Video.find().sort({ _id: -1 });
  const enriched = await Promise.all(videos.map(async v => {
    const user = await User.findById(v.userId);
    return {
      ...v.toObject(),
      channelName: user?.channelName || '不明',
      iconUrl: user?.iconUrl || ''
    };
  }));
  res.json(enriched);
});

// 視聴回数
app.post('/api/increment-viewcount/:id', async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: '動画が見つかりません' });
  video.viewCount++;
  await video.save();
  res.json({ viewCount: video.viewCount });
});

// 動画削除
// Cloudinaryのpublic_id抽出関数（ファイル上部に置いてもOK）
function extractCloudinaryPublicId(url) {
  const match = url.match(/\/upload\/(?:v\d+\/)?([^\.\/]+)\./);
  return match ? match[1] : null;
}

app.delete('/api/video/:id', async (req, res) => {
  const { userId } = req.body;
  const video = await Video.findById(req.params.id);
  if (!video || video.userId.toString() !== userId) {
    return res.status(403).json({ error: '削除権限がありません' });
  }

  try {
    // Cloudinaryから動画を削除
    const publicId = extractCloudinaryPublicId(video.url);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    }

    // コメントと動画データを削除
    await Comment.deleteMany({ videoId: req.params.id });
    await video.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error('動画削除エラー:', err);
    res.status(500).json({ error: '削除に失敗しました' });
  }
});

// コメント投稿・取得・編集・削除
app.post('/api/comment', async (req, res) => {
  const { videoId, userId, content } = req.body;
  const date = new Date().toLocaleString('ja-JP');
  const comment = new Comment({ videoId, userId, content, date });
  await comment.save();
  res.json(comment);
});

app.get('/api/comments/:videoId', async (req, res) => {
  const comments = await Comment.find({ videoId: req.params.videoId }).sort({ _id: 1 });
  const enriched = await Promise.all(comments.map(async c => {
    const user = await User.findById(c.userId);
    return {
      ...c.toObject(),
      username: user?.username || '名無し',
      iconUrl: user?.iconUrl || ''
    };
  }));
  res.json(enriched);
});

app.put('/api/comment/:id', async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (comment.userId.toString() !== req.body.userId) return res.status(403).json({ error: '編集権限なし' });
  comment.content = req.body.content;
  await comment.save();
  res.json({ success: true });
});

app.delete('/api/comment/:id', async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (comment.userId.toString() !== req.body.userId) return res.status(403).json({ error: '削除権限なし' });
  await comment.deleteOne();
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
