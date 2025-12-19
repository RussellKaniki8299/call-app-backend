const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Configuration stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/chat");
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// POST /api/chat/upload
router.post("/upload", upload.array("files"), (req, res) => {
  const files = req.files.map((file) => ({
    name: file.originalname,
    url: `/uploads/chat/${file.filename}`,
    type: file.mimetype,
    size: file.size,
  }));

  res.json({ files });
});

module.exports = router;
