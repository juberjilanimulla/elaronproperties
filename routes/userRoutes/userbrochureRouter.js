import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import brochuremodel from "../../model/brochuremodel.js";

const userbrochureRouter = Router();
userbrochureRouter.post("/create", createbrochureHandler);
export default userbrochureRouter;

const GLOBAL_BROCHURE_URL = process.env.BROCHURE_S3_URL;
async function createbrochureHandler(req, res) {
  try {
    const { firstname, lastname, email, mobile } = req.body;
    if (!firstname || !lastname || !email || !mobile) {
      return errorResponse(res, 400, "some params are missing");
    }
    if (email) {
      return errorResponse(res, 403, "email is already exist");
    }
    if (mobile) {
      return errorResponse(res, 403, "mobile number is already exist");
    }
    const params = {
      firstname,
      lastname,
      email,
      mobile,
      pdf: GLOBAL_BROCHURE_URL,
    };
    const brochure = await brochuremodel.create(params);
    successResponse(res, "success", {
      brochure,
      downloadLink: GLOBAL_BROCHURE_URL,
    });
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
