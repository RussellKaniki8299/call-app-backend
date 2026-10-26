const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { uploadDir, ffmpegPath } = require('../config/env');

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

const uniqueName = (ext) => `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
const outDir = (kind) => path.resolve(uploadDir, kind);
const safeUnlink = (p) => fs.promises.unlink(p).catch(() => {});

/** Redimensionne (1200px max) + convertit en WebP. @returns {{filename:string}} */
async function compressImage(file) {
  const filename = uniqueName('.webp');
  await sharp(file.path)
    .rotate() // respecte l'orientation EXIF
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(outDir('images'), filename));
  await safeUnlink(file.path);
  return { filename };
}

/** Compresse en H.264/AAC. @returns {Promise<{filename:string}>} */
function compressVideo(file) {
  const filename = uniqueName('.mp4');
  return new Promise((resolve, reject) => {
    ffmpeg(file.path)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset fast', '-crf 28', '-movflags +faststart'])
      .on('end', async () => {
        await safeUnlink(file.path);
        resolve({ filename });
      })
      .on('error', async (err) => {
        await safeUnlink(file.path);
        reject(err);
      })
      .save(path.join(outDir('videos'), filename));
  });
}

module.exports = { compressImage, compressVideo };
