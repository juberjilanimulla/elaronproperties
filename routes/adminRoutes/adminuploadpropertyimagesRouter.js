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
import propertymodel from "../../model/propertymodel.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// AWS S3 Setup
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Multer Setup
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
}).single("images");

const adminpropertyimages = Router();

adminpropertyimages.post("/:id", (req, res) => {
  upload(req, res, async (err) => {
    if (err) return errorResponse(res, 400, err.message || "Upload error");
    if (!req.file) return errorResponse(res, 400, "No file uploaded");

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath);
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${req.params.id}-${Date.now()}${fileExt}`;
    console.log("fileName", fileName);
    const s3Key = `properties/${fileName}`;

    try {
      const s3Res = await s3
        .upload({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: s3Key,
          Body: fileContent,
          ACL: "public-read",
          ContentType: req.file.mimetype,
        })
        .promise();

      const property = await propertymodel.findById(req.params.id);
      if (!property) {
        fs.unlinkSync(filePath);
        return errorResponse(res, 404, "Property not found");
      }

      property.images = s3Res.Location;
      await property.save();

      fs.unlinkSync(filePath);
      return successResponse(res, "Image uploaded successfully", property);
    } catch (error) {
      console.log("Upload failed:", error.message);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return errorResponse(res, 500, "Image upload failed");
    }
  });
});

export default adminpropertyimages;
