import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import brochuremodel from "../../model/brochuremodel.js";
import brochurefilemodel from "../../model/brochurefilemodel.js";

const userbrochureRouter = Router();
userbrochureRouter.post("/create", createbrochureHandler);
export default userbrochureRouter;

async function createbrochureHandler(req, res) {
  try {
    const { firstname, lastname, email, mobile } = req.body;
    if (!firstname || !lastname || !email || !mobile) {
      return errorResponse(res, 400, "some params are missing");
    }
    const existing = await brochuremodel.findOne({
      $or: [{ email }, { mobile }],
    });
    if (existing) return errorResponse(res, 403, "User already submitted");

    const latestBrochure = await brochurefilemodel
      .findOne()
      .sort({ uploadedAt: -1 });

    if (!latestBrochure)
      return errorResponse(res, 500, "No brochure available");

    const params = {
      firstname,
      lastname,
      email,
      mobile,
      pdf: latestBrochure.s3url,
    };
    const brochure = await brochuremodel.create(params);
    successResponse(res, "success", {
      brochure,
      downloadLink: latestBrochure.s3url,
    });
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
