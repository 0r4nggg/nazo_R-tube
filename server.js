// server.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary設定
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// MongoDB接続
mongoose.connect(process.env.MONGODB_URI)
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
  filename: String,
  cloudinaryId: String,
  date: String,
  viewCount: Number,
  userId: mongoose.Schema.Types.ObjectId
});

const User = mongoose.model('User', UserSchema);
const Video = mongoose.model('Video', VideoSchema);

// JWTミドルウェア
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ユーザー登録
app.post('/api/create-user', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const exist = await User.findOne({ ip });
  if (exist) return res.status(403).json({ error: 'このIPからは既に作成済みです' });

  const user = new User({ ...req.body, ip });
  await user.save();

  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  res.json({ ...user.toObject(), token });
});

// ログイン（簡易）
app.post('/api/login', async (req, res) => {
  const { channelName } = req.body;
  const user = await User.findOne({ channelName });
  if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });

  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  res.json({ ...user.toObject(), token });
});

// アップロード設定（Cloudinary）
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/api/upload-video', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload_stream({
      resource_type: 'video',
      folder: 'videos'
    }, async (error, result) => {
      if (error) return res.status(500).json({ error: 'Cloudinaryアップロード失敗' });

      const video = new Video({
        title: req.body.title,
        description: req.body.description,
        filename: result.secure_url,
        cloudinaryId: result.public_id,
        date: new Date().toLocaleString('ja-JP'),
        viewCount: 0,
        userId: req.user._id
      });
      await video.save();
      res.json({ videoId: video._id });
    });
    req.file.stream.pipe(result);
  } catch (e) {
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
      url: v.filename,
      channelName: user?.channelName || '不明',
      iconUrl: user?.iconUrl || ''
    };
  }));
  res.json(enriched);
});

// 動画削除
app.delete('/api/video/:id', authenticateToken, async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video || video.userId.toString() !== req.user._id) return res.status(403).json({ error: '削除権限がありません' });
  await cloudinary.uploader.destroy(video.cloudinaryId, { resource_type: 'video' });
  await video.deleteOne();
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

