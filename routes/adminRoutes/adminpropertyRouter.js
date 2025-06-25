import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import propertymodel from "../../model/propertymodel.js";
import adminpropertyimages from "./adminuploadpropertyimagesRouter.js";
import AWS from "aws-sdk";

const adminpropertyRouter = Router();

adminpropertyRouter.post("/", getallpropertiesHandler);
adminpropertyRouter.post("/create", createpropertiesHandler);
adminpropertyRouter.put("/update", updatepropertiesHandler);
adminpropertyRouter.delete("/delete", deletepropertiesHandler);
adminpropertyRouter.use("/upload", adminpropertyimages);
adminpropertyRouter.delete("/imagedelete", deleteimagepropertiesHandler);
export default adminpropertyRouter;

const s3 = new AWS.S3();

async function getallpropertiesHandler(req, res) {
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
    const totalCount = await propertymodel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated property
    const porperty = await propertymodel
      .find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    successResponse(res, "Success", { porperty, totalPages });
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function createpropertiesHandler(req, res) {
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
      features,
      surfaceareasqft,
      amenities,
    } = req.body;

    if (
      (!propertyname ||
        !startingprice ||
        !propertytype ||
        !rooms ||
        !bathrooms ||
        !title ||
        !description ||
        !location ||
        !brochureurl ||
        !surfaceareasqft,
      !features || !amenities)
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
      features,
      surfaceareasqft,
      amenities,
    };

    const property = await propertymodel.create(params);
    successResponse(res, "property added successfully", property);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function updatepropertiesHandler(req, res) {
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
    const updated = await propertymodel.findByIdAndUpdate(
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

async function deletepropertiesHandler(req, res) {
  try {
    const { _id } = req.body;
    if (!_id) {
      return errorResponse(res, 400, "Property ID (_id) is required");
    }

    // Find property before deletion (to access images)
    const property = await propertymodel.findById(_id);
    if (!property) {
      return errorResponse(res, 404, "Property not found");
    }

    // Delete all images from S3
    const deleteObjects = property.images.map((url) => ({
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
    await propertymodel.findByIdAndDelete(_id);

    return successResponse(res, "Property and associated images deleted");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function deleteimagepropertiesHandler(req, res) {
  const { imageurl, propertyid } = req.body;
  if (!imageurl || !propertyid) {
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
    const property = await propertymodel.findById(propertyid);
    if (!property) return errorResponse(res, 404, "Property not found");

    property.images = property.images.filter(
      (url) =>
        decodeURIComponent(url.trim()) !== decodeURIComponent(imageurl.trim())
    );

    await property.save();

    // 3. Refetch updated document to be 100% fresh
    const updated = await propertymodel.findById(propertyid);

    return successResponse(res, "Image deleted successfully", updated);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
