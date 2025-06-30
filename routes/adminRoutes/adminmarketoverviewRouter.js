import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import marketoverviewmodel from "../../model/marketoverviewmodel.js";
import adminmarketoveriviewimages from "./adminuploadmarketoverviewRouter.js";
import AWS from "aws-sdk";

const adminmarketoverviewRouter = Router();

adminmarketoverviewRouter.post("/", getallmarketoverviewHandler);
adminmarketoverviewRouter.post("/create", createmarketoverviewHandler);
adminmarketoverviewRouter.put("/update", updatemarketoverviewHandler);
adminmarketoverviewRouter.delete("/delete", deletemarketoverviewHandler);
adminmarketoverviewRouter.post(
  "/ispublished",
  ispublishedmarketoverviewHandler
);
adminmarketoverviewRouter.use("/upload", adminmarketoveriviewimages);
adminmarketoverviewRouter.delete(
  "/imagedelete",
  deleteimagemarketoverviewHandler
);

export default adminmarketoverviewRouter;

const s3 = new AWS.S3();

async function getallmarketoverviewHandler(req, res) {
  try {
    const { pageno = 0, filterBy = {}, sortby = {}, search = "" } = req.body;

    const limit = 10;
    const skip = pageno * limit;

    // Base query for offplanproperty
    let query = {};

    // Apply filters
    if (filterBy) {
      Object.keys(filterBy).forEach((key) => {
        if (filterBy[key] !== undefined) {
          query[key] = filterBy[key];
        }
      });
    }

    // Apply search
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      const searchFields = ["title", "subtitle", "category"];
      const searchConditions = searchFields.map((field) => ({
        [field]: { $regex: searchRegex },
      }));

      query = {
        $and: [{ $or: searchConditions }],
      };
    }

    // Apply sorting
    const sortBy =
      Object.keys(sortby).length !== 0
        ? Object.keys(sortby).reduce((acc, key) => {
            acc[key] = sortby[key] === "asc" ? 1 : -1;
            return acc;
          }, {})
        : { createdAt: -1 }; // Default sorting by most recent

    // Fetch total count for pagination
    const totalCount = await marketoverviewmodel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated property
    const marketoverview = await marketoverviewmodel
      .find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    successResponse(res, "Success", { marketoverview, totalPages });
  } catch (error) {
    console.log(error, "error");
    errorResponse(res, 500, "internal server error");
  }
}

async function createmarketoverviewHandler(req, res) {
  try {
    const { title, subtitle, date, category, sections, ispublished } = req.body;
    if (
      !title ||
      !subtitle ||
      !date ||
      !category ||
      !sections ||
      !ispublished
    ) {
      return errorResponse(res, 400, "some params are missing");
    }
    const params = {
      title,
      subtitle,
      date,
      category,
      sections,
      ispublished,
    };
    const marketoverview = await marketoverviewmodel.create(params);
    successResponse(res, "successfully", marketoverview);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function updatemarketoverviewHandler(req, res) {
  try {
    const { _id, ...updatedData } = req.body;
    const options = { new: true };
    if (
      !updatedData.title ||
      !updatedData.subtitle ||
      !updatedData.date ||
      !updatedData.category ||
      !updatedData.sections
    ) {
      return errorResponse(res, 404, "Some params are missing");
    }
    const updated = await marketoverviewmodel.findByIdAndUpdate(
      _id,
      updatedData,
      options
    );
    successResponse(res, "success", updated);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function deletemarketoverviewHandler(req, res) {
  try {
    const { _id } = req.body;
    if (!_id) {
      return errorResponse(res, 400, "marketoverview ID (_id) is required");
    }

    // Find property before deletion (to access images)
    const marketoverview = await marketoverviewmodel.findById(_id);
    if (!marketoverview) {
      return errorResponse(res, 404, "marketoverview not found");
    }

    // Delete all images from S3
    const deleteObjects = marketoverview.coverimage.map((url) => ({
      Key: url.split(".amazonaws.com/")[1],
    }));

    if (deleteObjects.length > 0) {
      await s3
        .deleteObjects({
          Bucket: process.env.AWS_S3_BUCKET,
          Delete: {
            Objects: deleteObjects,
            Quiet: true,
          },
        })
        .promise();
    }

    // Delete property from DB
    await marketoverviewmodel.findByIdAndDelete(_id);

    return successResponse(res, "news and associated images deleted");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function ispublishedmarketoverviewHandler(req, res) {
  try {
    const { _id, ispublished } = req.body;
    if (!_id) {
      return errorResponse(res, 400, "some params are missing");
    }
    if (typeof ispublished !== "boolean") {
      return errorResponse(res, 400, "ispublished must to be true or false");
    }
    const updatedNews = await newsmodel.findByIdAndUpdate(
      _id,
      { ispublished },
      { new: true }
    );
    successResponse(res, "success", updatedNews);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function deleteimagemarketoverviewHandler(req, res) {
  const { imageurl, marketoverviewid } = req.body;
  if (!imageurl || !marketoverviewid) {
    return errorResponse(res, 400, "some params are missing");
  }
  const s3Key = imageurl.split(".amazonaws.com/")[1];
  if (!s3Key) {
    return errorResponse(res, 400, "invalid s3 url");
  }
  try {
    await s3
      .deleteObject({ Bucket: process.env.AWS_S3_BUCKET, Key: s3Key })
      .promise();
    // 2. Remove from DB
    const marketoverview = await marketoverviewmodel.findById(marketoverviewid);

    if (!marketoverview)
      return errorResponse(res, 404, "rentProperty not found");

    marketoverview.coverimage = marketoverview.coverimage.filter(
      (url) =>
        decodeURIComponent(url.trim()) !== decodeURIComponent(imageurl.trim())
    );

    await marketoverview.save();

    // 3. Refetch updated document to be 100% fresh
    const updated = await marketoverviewmodel.findById(marketoverviewid);

    return successResponse(res, "Image deleted successfully");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
