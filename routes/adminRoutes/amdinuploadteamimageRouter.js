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
import teammodel from "../../model/teammodel.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// AWS Setup
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Multer config (single file)
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
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(ext)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
}).single("teamimage");


const adminteamimage = Router();

adminteamimage.post("/:id", (req, res) => {
  upload(req, res, async (err) => {
    if (err) return errorResponse(res, 400, err.message || "Upload error");
    if (!req.file) return errorResponse(res, 400, "No file uploaded");
    try {
      const team = await teammodel.findById(req.params.id);
   
      if (!team) {
        fs.unlinkSync(req.file.path);
        return errorResponse(res, 404, "Team member not found");
      }

      const fileContent = fs.readFileSync(req.file.path);
      const fileName = `team/${req.params.id}${path.extname(
        req.file.originalname
      )}`;

      const s3Res = await s3
        .upload({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: fileName,
          Body: fileContent,
          ContentType: req.file.mimetype,
        })
        .promise();

      team.teamimage = s3Res.Location;
      fs.unlinkSync(req.file.path);

      await team.save();
      return successResponse(res, "Team image uploaded successfully", team);
    } catch (error) {
      console.error("Upload failed:", error.message);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return errorResponse(res, 500, "Image upload failed");
    }
  });
});

export default adminteamimage;
