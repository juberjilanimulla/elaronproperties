import { Router } from "express";
import sellpropertymodel from "../../model/sellpropertymodel.js";
import {
  successResponse,
  errorResponse,
} from "../../helpers/serverResponse.js";
import AWS from "aws-sdk";

const adminsellpropertyRouter = Router();

adminsellpropertyRouter.post("/", getallusersellpropertyHandler);
adminsellpropertyRouter.delete("/delete", deletesellpropertyHandler);
adminsellpropertyRouter.delete("/imagedelete", deleteimagesellpropertyHandler);

export default adminsellpropertyRouter;

const s3 = new AWS.S3();

async function getallusersellpropertyHandler(req, res) {
  try {
    const { pageno = 0, filterBy = {}, sortby = {}, search = "" } = req.body;

    const limit = 10;
    const skip = pageno * limit;

    // Base query for porperty
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
      const searchFields = [
        "propertytype",
        "rooms",
        "startingprice",
        "bathrooms",
        "location",
        "amenities",
        "surfaceareasqft",
      ];
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
    const totalCount = await sellpropertymodel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated property
    const sellproperty = await sellpropertymodel
      .find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    successResponse(res, "Success", { sellproperty, totalPages });
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error ");
  }
}

async function deletesellpropertyHandler(req, res) {
  try {
    const { _id } = req.body;
    if (!_id) {
      return errorResponse(res, 400, "sell property ID (_id) is required");
    }

    // Find property before deletion (to access images)
    const sellproperty = await sellpropertymodel.findById(_id);
    if (!sellproperty) {
      return errorResponse(res, 404, "sellproperty not found");
    }

    // Delete all images from S3
    const deleteObjects = sellproperty.images.map((url) => ({
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
    await sellpropertymodel.findByIdAndDelete(_id);

    return successResponse(res, "sell propertys and associated images deleted");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function deleteimagesellpropertyHandler(req, res) {
  const { imageurl, sellpropertyid } = req.body;
  if (!imageurl || !sellpropertyid) {
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
    const sellproperty = await sellpropertymodel.findById(sellpropertyid);
    
    if (!sellproperty)
      return errorResponse(res, 404, "sell property not found");
    const decodedImageUrl = decodeURIComponent(imageurl.trim());

    // Check if the image URL exists in the array
    const isMatch = sellproperty.images.some(
      (img) => decodeURIComponent(img.trim()) === decodedImageUrl
    );

   

    if (!isMatch) {
      return errorResponse(
        res,
        400,
        "Image URL does not match any of the current sell property images"
      );
    }

    // Filter out the image to delete
    sellproperty.images = sellproperty.images.filter(
      (img) => decodeURIComponent(img.trim()) !== decodedImageUrl
    );

    await sellproperty.save();
    // 3. Refetch updated document to be 100% fresh
    const updated = await sellpropertymodel.findById(sellpropertyid);

    return successResponse(res, "Image deleted successfully", updated);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error ");
  }
}
