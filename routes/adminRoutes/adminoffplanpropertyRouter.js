import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import offplanpropertymodel from "../../model/offplanpropertymodel.js";

const adminoffplanpropertyRouter = Router();

adminoffplanpropertyRouter.post("/", getoffplanpropertyHandler);
adminoffplanpropertyRouter.post("/create", createoffplanpropertyHandler);
adminoffplanpropertyRouter.put("/update", updateoffplanpropertyHandler);
adminoffplanpropertyRouter.delete("/delete", deleteoffplanpropertyHandler);

export default adminoffplanpropertyRouter;

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
    const offplanproperty = await offplanpropertymodel.findOneAndDelete({
      _id: _id,
    });
    successResponse(res, "successfully deleted");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

