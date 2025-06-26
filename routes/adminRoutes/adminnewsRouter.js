import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import newsmodel from "../../model/newsmodel.js";
import AWS from "aws-sdk";
import adminnewsimages from "./adminuploadnewsimagesRouter.js";

const adminnewsRouter = Router();

adminnewsRouter.post("/", getallnewsHandler);
adminnewsRouter.post("/create", createnewsHandler);
adminnewsRouter.put("/update", updatenewsHandler);
adminnewsRouter.delete("/delete", deletenewsHandler);
adminnewsRouter.post("/ispublished", ispublishedHandler);
adminnewsRouter.delete("/imagedelete", deleteimagenewsHandler);
adminnewsRouter.use("/imageupload", adminnewsimages);
export default adminnewsRouter;

const s3 = new AWS.S3();

async function getallnewsHandler(req, res) {
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
    const totalCount = await newsmodel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated property
    const news = await newsmodel
      .find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    successResponse(res, "Success", { news, totalPages });
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function createnewsHandler(req, res) {
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
    const news = await newsmodel.create(params);
    successResponse(res, "successfully", news);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function updatenewsHandler(req, res) {
  try {
    const { _id, ...updatedData } = req.body;
    const options = { new: true };
    if (
      !updatedData.title ||
      !updatedData.subtitle ||
      !updatedData.date ||
      !updatedData.category ||
      !updatedData.sections ||
      !updatedData.ispublished
    ) {
      return errorResponse(res, 404, "Some params are missing");
    }
    const updated = await newsmodel.findByIdAndUpdate(
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

async function deletenewsHandler(req, res) {
  try {
    const { _id } = req.body;
    if (!_id) {
      return errorResponse(res, 400, "news ID (_id) is required");
    }

    // Find property before deletion (to access images)
    const news = await newsmodel.findById(_id);
    if (!news) {
      return errorResponse(res, 404, "news not found");
    }

    // Delete all images from S3
    const deleteObjects = news.coverimage.map((url) => ({
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
    await newsmodel.findByIdAndDelete(_id);

    return successResponse(res, "news and associated images deleted");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function ispublishedHandler(req, res) {
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
    if (!updatedNews) {
      return errorResponse(res, 404, "news article not found");
    }
    successResponse(res, "published status updated", updatedNews);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function deleteimagenewsHandler(req, res) {
  const { imageurl, newsid } = req.body;
  if (!imageurl || !newsid) {
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
    const news = await newsmodel.findById(newsid);

    if (!news) return errorResponse(res, 404, "rentProperty not found");

    news.coverimage = news.coverimage.filter(
      (url) =>
        decodeURIComponent(url.trim()) !== decodeURIComponent(imageurl.trim())
    );

    await news.save();

    // 3. Refetch updated document to be 100% fresh
    const updated = await newsmodel.findById(newsid);
   
    return successResponse(res, "Image deleted successfully");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
