import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.resolve(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedExtensions = ['.pdf', '.pptx', '.ppt', '.png', '.jpg', '.jpeg', '.txt', '.md', '.tex'];

  // 1. Verify extension
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`Unsupported file format: ${ext}. Only modern PDFs, PowerPoint presentations (.pptx, .ppt), and scanned note images are supported.`));
  }

  // 2. Validate MIME type consistency
  if (ext === '.pdf' && file.mimetype && !file.mimetype.includes('pdf') && !file.mimetype.includes('octet-stream')) {
    return cb(new Error('File content does not match .pdf format. Upload rejected.'));
  }

  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 Megabytes safeguard limit
  }
});
