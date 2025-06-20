import { Router } from "express";
import {
  errorResponse,
  successResponse,
} from "../../helpers/serverResponse.js";
import sellpropertymodel from "../../model/sellpropertymodel.js";

const usersellpropertyRouter = Router();

usersellpropertyRouter.post("/", createusersellpropertyHandler);

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
    };
    const sellproperty = await sellpropertymodel.create(params);
    successResponse(res, "successfully", sellproperty);
  } catch (error) {
    console.log("error", error);
    errorResponse(res, 500, "internal server error");
  }
}
