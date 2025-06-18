import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import usermodel from "../../model/usermodel.js";

const userContactRouter = Router();

userContactRouter.post("/create", createcontactHandler);

export default userContactRouter;

async function createcontactHandler(req, res) {
  try {
    const { firstname, lastname, email, mobile, description } = req.body;
    if (!firstname || !lastname || !email || !mobile || !description) {
      return errorResponse(res, 400, "some params are missing");
    }
    const params = { firstname, lastname, email, mobile, description };
    const contact = await usermodel.create(params);
    successResponse(res, "successfully created", contact);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
