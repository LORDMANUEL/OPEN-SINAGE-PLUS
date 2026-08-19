const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

class MediaTranscoder {
  constructor({ dataDir = process.env.OPEN_SIGNAGE_DATA_DIR || '/data', ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg', timeoutMs = 180000, spawnImpl = spawn } = {}) {
    this.dataDir = dataDir;
    this.ffmpegPath = ffmpegPath;
    this.timeoutMs = Math.max(10000, Number(timeoutMs || 180000));
    this.spawnImpl = spawnImpl;
  }

  async transcode(bytes, { fileName = 'media', preset = 'screen-1080p' } = {}) {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new Error('media bytes are required');
    const workDir = path.join(this.dataDir, 'transcode');
    await fs.mkdir(workDir, { recursive: true, mode: 0o700 });
    const id = crypto.randomUUID();
    const inputExt = safeExtension(fileName);
    const inputPath = path.join(workDir, `${id}.input${inputExt}`);
    const outputPath = path.join(workDir, `${id}.mp4`);
    await fs.writeFile(inputPath, bytes, { mode: 0o600 });
    try {
      await runProcess(this.spawnImpl, this.ffmpegPath, buildFfmpegArgs(inputPath, outputPath, preset), this.timeoutMs);
      const output = await fs.readFile(outputPath);
      if (!output.length) throw new Error('ffmpeg produced an empty file');
      return { bytes: output, fileName: `${safeMediaStem(fileName)}.mp4`, contentType: 'video/mp4', preset };
    } finally {
      await Promise.allSettled([fs.rm(inputPath, { force: true }), fs.rm(outputPath, { force: true })]);
    }
  }
}

function buildFfmpegArgs(inputPath, outputPath, preset = 'screen-1080p') {
  const scale = preset === 'screen-720p' ? 'scale=w=min(1280\,iw):h=-2:force_original_aspect_ratio=decrease' : 'scale=w=min(1920\,iw):h=-2:force_original_aspect_ratio=decrease';
  return ['-y', '-i', inputPath, '-map_metadata', '-1', '-vf', scale, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', outputPath];
}

function runProcess(spawnImpl, executable, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(executable, args, { stdio: ['ignore', 'ignore', 'pipe'], shell: false });
    let stderr = '';
    child.stderr?.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-8000); });
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('ffmpeg timed out')); }, timeoutMs);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => { clearTimeout(timer); if (code === 0) resolve(); else reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-2000)}`)); });
  });
}
function safeExtension(fileName) {
  const ext = path.extname(path.basename(String(fileName || ''))).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '.bin';
}
function safeMediaStem(fileName) {
  const base = path.basename(String(fileName || 'media'), path.extname(String(fileName || 'media')));
  const clean = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-').slice(0, 120);
  return clean || 'media';
}

module.exports = { MediaTranscoder, buildFfmpegArgs, safeMediaStem };
