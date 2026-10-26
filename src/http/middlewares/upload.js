const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { uploadDir, maxUploadBytes } = require('../../config/env');

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const filename = (_req, file, cb) =>
  cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);

const diskUpload = (subDir) =>
  multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, ensureDir(path.resolve(uploadDir, subDir))),
      filename,
    }),
    limits: { fileSize: maxUploadBytes },
  });

/** Fichiers de chat (stockés tels quels) */
const chatUpload = diskUpload('chat');
/** Fichiers temporaires avant compression image/vidéo */
const tempUpload = diskUpload('temp');

module.exports = { chatUpload, tempUpload, ensureDir };
