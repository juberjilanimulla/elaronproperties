import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import offplanpropertymodel from "../../model/offplanpropertymodel.js";
import adminoffplanimages from "./adminuploadoffplanimageRouter.js";
import AWS from "aws-sdk";

const adminoffplanpropertyRouter = Router();

adminoffplanpropertyRouter.post("/", getoffplanpropertyHandler);
adminoffplanpropertyRouter.post("/create", createoffplanpropertyHandler);
adminoffplanpropertyRouter.put("/update", updateoffplanpropertyHandler);
adminoffplanpropertyRouter.delete("/delete", deleteoffplanpropertyHandler);
adminoffplanpropertyRouter.use("/upload", adminoffplanimages);
adminoffplanpropertyRouter.delete("/imagedelete", deleteimageoffplanHandler);

export default adminoffplanpropertyRouter;

const s3 = new AWS.S3();

async function getoffplanpropertyHandler(req, res) {
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
    const totalCount = await offplanpropertymodel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated property
    const offplanproperty = await offplanpropertymodel
      .find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    successResponse(res, "Success", { offplanproperty, totalPages });
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function createoffplanpropertyHandler(req, res) {
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
      !brochureurl ||
      !surfaceareasqft ||
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

    const offplanproperty = await offplanpropertymodel.create(params);
    successResponse(res, "offplanproperty added successfully", offplanproperty);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function updateoffplanpropertyHandler(req, res) {
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
    const updated = await offplanpropertymodel.findByIdAndUpdate(
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

async function deleteoffplanpropertyHandler(req, res) {
  try {
    const { _id } = req.body;
    if (!_id) {
      return errorResponse(res, 400, "some a params are missing");
    }
    // offplan
    const offplan = await offplanpropertymodel.findById(_id);
    if (!offplan) {
      return errorResponse(res, 404, "news not found");
    }

    // Delete all images from S3
    const deleteObjects = offplan.images.map((url) => ({
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
    await offplanpropertymodel.findByIdAndDelete(_id);

    return successResponse(res, "news and associated images deleted");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function deleteimageoffplanHandler(req, res) {
  const { imageurl, offplanid } = req.body;
  if (!imageurl || !offplanid) {
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
    const offplan = await offplanpropertymodel.findById(offplanid);

    if (!offplan) return errorResponse(res, 404, "rentProperty not found");

    offplan.images = offplan.images.filter(
      (url) =>
        decodeURIComponent(url.trim()) !== decodeURIComponent(imageurl.trim())
    );

    await offplan.save();

    // 3. Refetch updated document to be 100% fresh
    const updated = await offplanpropertymodel.findById(offplanid);

    return successResponse(res, "Image deleted successfully");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error ");
  }
}
