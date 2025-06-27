import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import teammodel from "../../model/teammodel.js";
import adminteamimage from "./amdinuploadteamimageRouter.js";
import AWS from "aws-sdk";
const adminteamRouter = Router();

adminteamRouter.post("/", getallteamHandler);
adminteamRouter.post("/create", createteamHandler);
adminteamRouter.put("/update", updateteamHandler);
adminteamRouter.delete("/delete", deleteteamHandler);
adminteamRouter.use("/upload", adminteamimage);
adminteamRouter.delete("/imagedelete", deleteimageteamHandler);

export default adminteamRouter;

const s3 = new AWS.S3();

async function getallteamHandler(req, res) {
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
      const searchFields = ["firstname", "lastname", "department", "languages"];
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
    const totalCount = await teammodel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated property
    const teams = await teammodel
      .find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    successResponse(res, "Success", { teams, totalPages });
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function createteamHandler(req, res) {
  try {
    const { firstname, lastname, department, languages } = req.body;
    if (!firstname || !lastname || !department || !languages) {
      return errorResponse(res, 400, "some params are missing");
    }
    const params = { firstname, lastname, department, languages };
    const team = await teammodel.create(params);
    successResponse(res, "success", team);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function updateteamHandler(req, res) {
  try {
    const { _id, ...updatedData } = req.body;
    const options = { new: true };
    if (
      !updatedData.firstname ||
      !updatedData.lastname ||
      !updatedData.department ||
      !updatedData.languages
    ) {
      return errorResponse(res, 404, "Some params are missing");
    }
    const updated = await teammodel.findByIdAndUpdate(
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

async function deleteteamHandler(req, res) {
  try {
    const { _id } = req.body;
    if (!_id) {
      return errorResponse(res, 400, "team ID (_id) is required");
    }

    // Find property before deletion (to access images)
    const team = await teammodel.findById(_id);
    if (!team) {
      return errorResponse(res, 404, "team not found");
    }

    // Delete all images from S3
    const deleteObjects = team.teamimage.map((url) => ({
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
    await teammodel.findByIdAndDelete(_id);

    return successResponse(res, "Property and associated images deleted");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function deleteimageteamHandler(req, res) {
  const { imageurl, teamid } = req.body;
  if (!imageurl || !teamid) {
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
    const team = await teammodel.findById(teamid);

    if (!team) return errorResponse(res, 404, "team not found");
    const isMatch =
      decodeURIComponent(team.teamimage.trim()) ===
      decodeURIComponent(imageurl.trim());

    if (!isMatch) {
      return errorResponse(
        res,
        400,
        "Image URL does not match current team image"
      );
    }
    team.teamimage = "";
    await team.save();
    // 3. Refetch updated document to be 100% fresh
    const updated = await teammodel.findById(teamid);

    return successResponse(res, "Image deleted successfully", updated);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
