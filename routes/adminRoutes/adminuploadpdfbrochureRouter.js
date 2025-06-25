import { Router } from "express";
import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  successResponse,
  errorResponse,
} from "../../helpers/serverResponse.js";
import brochurefilemodel from "../../model/brochurefilemodel.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const adminuploadpdfbrochure = Router();

// AWS S3 Setup
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../temp");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pdf") cb(null, true);
    else cb(new Error("Only PDF files allowed"));
  },
}).single("pdf");

adminuploadpdfbrochure.post("/pdf", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return errorResponse(res, 400, err.message || "Upload error");
    }


    const file = req.file;
    if (!file) return errorResponse(res, 400, "No PDF file uploaded");

    try {
      const fileContent = fs.readFileSync(file.path);
      const fileName = `brochures/${Date.now()}-${file.originalname}`;

      // Upload to S3
      const s3Res = await s3
        .upload({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: fileName,
          Body: fileContent,
          ContentType: file.mimetype,
        })
        .promise();

      fs.unlinkSync(file.path); // Clean up temp file

      // Save to DB
      await brochurefilemodel.create({ s3url: s3Res.Location });

      return successResponse(res, "PDF uploaded successfully", {
        s3url: s3Res.Location,
      });
    } catch (error) {
      console.error("Upload failed:", error);

      return errorResponse(res, 500, "Upload failed");
    }
  });
});

export default adminuploadpdfbrochure;
