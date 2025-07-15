// server.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// MongoDB接続
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

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
  filename: String,
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

// アップロード設定
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// IP取得
function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',').shift().trim() || req.socket.remoteAddress;
}

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

// 動画アップロード
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  const { title, description, userId } = req.body;
  const date = new Date().toLocaleString('ja-JP');
  const video = new Video({
    title,
    description,
    filename: req.file.filename,
    date,
    viewCount: 0,
    userId
  });
  await video.save();
  res.json({ videoId: video._id });
});

// 動画取得
app.get('/api/videos', async (req, res) => {
  const videos = await Video.find().sort({ _id: -1 });
  const enriched = await Promise.all(videos.map(async v => {
    const user = await User.findById(v.userId);
    return {
      ...v.toObject(),
      url: '/uploads/' + v.filename,
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
app.delete('/api/video/:id', async (req, res) => {
  const { userId } = req.body;
  const video = await Video.findById(req.params.id);
  if (!video || video.userId.toString() !== userId) return res.status(403).json({ error: '削除権限がありません' });
  await Comment.deleteMany({ videoId: req.params.id });
  await video.deleteOne();
  res.json({ success: true });
});

// コメント
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

