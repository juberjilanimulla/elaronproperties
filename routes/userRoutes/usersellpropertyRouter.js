import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import sellpropertymodel from "../../model/sellpropertymodel.js";
import usersellpropertyimage from "./useruploadsellpropertyimagesRouter.js";

const usersellpropertyRouter = Router();

usersellpropertyRouter.post("/", createusersellpropertyHandler);
usersellpropertyRouter.get("/", getallsellpropertyHandler);
usersellpropertyRouter.use("/upload", usersellpropertyimage);
export default usersellpropertyRouter;

async function createusersellpropertyHandler(req, res) {
  try {
    const {
      propertytype,
      numberofrooms,
      numberofbathrooms,
      housesurfaceareasqft,
      houseyearofconstruction,
      houseneighbourhood,
      houseaddress,
      houseamenities,
      firstname,
      lastname,
      email,
      mobile,
      description,
      images,
    } = req.body;
    if (
      !propertytype ||
      !numberofrooms ||
      !numberofbathrooms ||
      !housesurfaceareasqft ||
      !houseyearofconstruction ||
      !houseneighbourhood ||
      !houseaddress ||
      !houseamenities ||
      !firstname ||
      !lastname ||
      !email ||
      !mobile ||
      !description
    ) {
      return errorResponse(res, 400, "some params are missing");
    }
    const params = {
      propertytype,
      numberofrooms,
      numberofbathrooms,
      housesurfaceareasqft,
      houseyearofconstruction,
      houseneighbourhood,
      houseaddress,
      houseamenities,
      firstname,
      lastname,
      email,
      mobile,
      description,
      images,
    };
    const sellproperty = await sellpropertymodel.create(params);
    successResponse(res, "successfully", sellproperty);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}

async function getallsellpropertyHandler(req, res) {
  try {
    const sellproperty = await sellpropertymodel.find();
    successResponse(res, "successfully", sellproperty);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
