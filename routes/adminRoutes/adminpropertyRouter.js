import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import propertymodel from "../../model/propertymodel.js";

const adminpropertyRouter = Router();

adminpropertyRouter.post("/", getallpropertiesHandler);
adminpropertyRouter.post("/create", createpropertiesHandler);
adminpropertyRouter.put("/update", updatepropertiesHandler);
adminpropertyRouter.delete("/delete", deletepropertiesHandler);
export default adminpropertyRouter;

async function getallpropertiesHandler(req, res) {
  try {
    const { pageno = 0, filterBy = {}, sortby = {}, search = "" } = req.body;

    const limit = 10;
    const skip = pageno * limit;

    // Base query for contacts
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
      const searchFields = ["propertytype", "rooms", "startingprice","bathrooms","location","amenities"];
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
    const totalCount = await contactmodel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated contacts
    const contacts = await contactmodel
      .find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    successResponse(res, "Success", { contacts, totalPages });
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
      features,
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
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function deletepropertiesHandler(req, res) {
  try {
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
