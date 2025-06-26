import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import rentpropertymodel from "../../model/rentpropertymodel.js";
import adminrentpropertyimages from "./adminuploadrentpropertyimagesRouter.js";
import AWS from "aws-sdk";

const adminrentpropertyRouter = Router();
adminrentpropertyRouter.use("/upload", adminrentpropertyimages);
adminrentpropertyRouter.post("/", getallrentpropertyHandler);
adminrentpropertyRouter.post("/create", createrentpropertyHandler);
adminrentpropertyRouter.put("/update", updaterentpropertyHandler);
adminrentpropertyRouter.delete("/delete", deleterentpropertyHandler);
adminrentpropertyRouter.delete("/imagedelete", deleteimagerentpropertyHandler);

export default adminrentpropertyRouter;

const s3 = new AWS.S3();

async function getallrentpropertyHandler(req, res) {
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
    const totalCount = await rentpropertymodel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated property
    const rentproperty = await rentpropertymodel
      .find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    successResponse(res, "Success", { rentproperty, totalPages });
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function createrentpropertyHandler(req, res) {
  try {
    const {
      propertyname,
      startingprice,
      propertytype,
      rooms,
      bathrooms,
      title,
      description,
      location,
      brochureurl,
      surfaceareasqft,
      features,
      amenities,
    } = req.body;

    if (
      !propertyname ||
      !startingprice ||
      !propertytype ||
      !rooms ||
      !bathrooms ||
      !title ||
      !description ||
      !location ||
      !surfaceareasqft ||
      !brochureurl ||
      !features ||
      !amenities
    ) {
      return errorResponse(res, 400, "some params are missing");
    }
    const params = {
      propertyname,
      startingprice,
      propertytype,
      rooms,
      bathrooms,
      title,
      description,
      location,
      brochureurl,
      surfaceareasqft,
      features,
      amenities,
    };

    const rentproperty = await rentpropertymodel.create(params);
    successResponse(res, "rentproperty added successfully", rentproperty);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function updaterentpropertyHandler(req, res) {
  try {
    const { _id, ...updatedData } = req.body;
    const options = { new: true };
    if (
      !updatedData.propertyname ||
      !updatedData.propertytype ||
      !updatedData.startingprice ||
      !updatedData.rooms ||
      !updatedData.bathrooms ||
      !updatedData.location ||
      !updatedData.amenities ||
      !updatedData.title ||
      !updatedData.surfaceareasqft ||
      !updatedData.description ||
      !updatedData.features ||
      !updatedData.brochureurl
    ) {
      return errorResponse(res, 404, "Some params are missing");
    }
    const updated = await rentpropertymodel.findByIdAndUpdate(
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

async function deleterentpropertyHandler(req, res) {
  try {
    const { _id } = req.body;
    if (!_id) {
      return errorResponse(res, 400, "Property ID (_id) is required");
    }

    // Find property before deletion (to access images)
    const rentproperty = await rentpropertymodel.findById(_id);
    if (!rentproperty) {
      return errorResponse(res, 404, "rentproperty not found");
    }

    // Delete all images from S3
    const deleteObjects = rentproperty.images.map((url) => ({
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
    await rentpropertymodel.findByIdAndDelete(_id);

    return successResponse(res, "Property and associated images deleted");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function deleteimagerentpropertyHandler(req, res) {
  const { imageurl, rentpropertyid } = req.body;
  if (!imageurl || !rentpropertyid) {
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
    const rentproperty = await rentpropertymodel.findById(rentpropertyid);
    if (!rentproperty) return errorResponse(res, 404, "rentProperty not found");

    rentproperty.images = rentproperty.images.filter(
      (url) =>
        decodeURIComponent(url.trim()) !== decodeURIComponent(imageurl.trim())
    );

    await rentproperty.save();

    // 3. Refetch updated document to be 100% fresh
    const updated = await rentpropertymodel.findById(rentpropertyid);

    return successResponse(res, "Image deleted successfully", updated);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
