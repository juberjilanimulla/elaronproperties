import { Router } from "express";
import brochuremodel from "../../model/brochuremodel.js";
import {
  successResponse,
  errorResponse,
} from "../../helpers/serverResponse.js";
import adminuploadpdfbrochure from "./adminuploadpdfbrochureRouter.js";

const adminbrochureRouter = Router();

adminbrochureRouter.post("/", getallbrochureHandler);
adminbrochureRouter.delete("/delete", deletebrochureHandler);
adminbrochureRouter.use("/upload", adminuploadpdfbrochure);

export default adminbrochureRouter;

async function getallbrochureHandler(req, res) {
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
      const searchFields = ["firstname", "lastname", "email", "description"];
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
    const totalCount = await brochuremodel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated property
    const brochure = await brochuremodel
      .find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    successResponse(res, "Success", { brochure, totalPages });
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function deletebrochureHandler(req, res) {
  try {
    const { _id } = req.body;
    if (!_id) {
      return errorResponse(res, 400, "some params are missing");
    }
    const brochure = await brochuremodel.findByIdAndDelete({ _id: _id });
    successResponse(res, "success");
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
