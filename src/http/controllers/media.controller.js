const { compressImage, compressVideo } = require('../../services/media.service');

const publicUrl = (req, kind, filename) =>
  `${req.protocol}://${req.get('host')}/uploads/${kind}/${filename}`;

exports.uploadImages = async (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({ success: false, message: 'Aucune image envoyée' });
  }
  const images = [];
  for (const file of req.files) {
    const { filename } = await compressImage(file);
    images.push({ url: publicUrl(req, 'images', filename), filename });
  }
  res.json({ success: true, images });
};

exports.uploadVideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucune vidéo envoyée' });
  }
  const { filename } = await compressVideo(req.file);
  res.json({ success: true, url: publicUrl(req, 'videos', filename), filename });
};

exports.uploadChatFiles = (req, res) => {
  const files = (req.files || []).map((file) => ({
    name: file.originalname,
    url: `/uploads/chat/${file.filename}`,
    type: file.mimetype,
    size: file.size,
  }));
  res.json({ files });
};
