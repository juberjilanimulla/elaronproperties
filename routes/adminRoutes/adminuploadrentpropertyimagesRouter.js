import { Router } from "express";
import multer from "multer";
import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  successResponse,
  errorResponse,
} from "../../helpers/serverResponse.js";
import rentpropertymodel from "../../model/rentpropertymodel.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// AWS S3 Setup
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Multer Setup (temporary local storage before uploading to S3)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../temp");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(ext);
    if (isImage) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
}).array("images", 10); // Support multiple files (max 10)

const adminrentpropertyimages = Router();

// MULTI IMAGE UPLOAD
adminrentpropertyimages.post("/:id", (req, res) => {
  upload(req, res, async (err) => {
    if (err) return errorResponse(res, 400, err.message || "Upload error");
    if (!req.files || req.files.length === 0)
      return errorResponse(res, 400, "No files uploaded");

    try {
      const rentproperty = await rentpropertymodel.findById(req.params.id);
      if (!rentproperty) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
        return errorResponse(res, 404, "rentproperty not found");
      }

      if (!Array.isArray(rentproperty.images)) {
        rentproperty.images = [];
      }

      for (const file of req.files) {
        const fileContent = fs.readFileSync(file.path);
        const fileName = `${req.params.id}-${Date.now()}${path.extname(
          file.originalname
        )}`;
        const s3Key = `rentproperties/${fileName}`;

        const s3Res = await s3
          .upload({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            Body: fileContent,
            ContentType: file.mimetype,
          })
          .promise();

        rentproperty.images.push(s3Res.Location); // Add image URL
        fs.unlinkSync(file.path); // Remove temp file
      }

      await rentproperty.save();
      return successResponse(res, "Images uploaded successfully", rentproperty);
    } catch (error) {
      console.error("Upload failed:", error.message);
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
      return errorResponse(res, 500, "Image upload failed");
    }
  });
});

export default adminrentpropertyimages;
