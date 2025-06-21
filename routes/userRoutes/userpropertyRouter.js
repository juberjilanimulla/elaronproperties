import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";

const userpropertyRouter = Router();

userpropertyRouter.use("/", getallpropertyHandler);

export default userpropertyRouter;

async function getallpropertyHandler(req, res) {
  try {
    const property = await propertymodel.find();
    successResponse(res, "success", property);
  } catch (error) {
    console.log("Error", error);
    errorResponse(res, 500, "internal server error");
  }
}
