import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import marketoverviewmodel from "../../model/marketoverviewmodel.js";
import adminmarketoveriviewimages from "./adminuploadmarketoverviewRouter.js";

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
adminmarketoverviewRouter.delete("/delete", deleteimagemarketoverviewHandler);

export default adminmarketoverviewRouter;

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
      !updatedData.sections ||
      !updatedData.ispublished
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
      return errorResponse(res, 400, "some params are missing");
    }
    const marketoverview = await marketoverviewmodel.findByIdAndDelete({
      _id: _id,
    });
    successResponse(res, "success");
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
  try {
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
