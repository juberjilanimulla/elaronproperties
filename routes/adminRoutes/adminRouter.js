import { Router } from "express";
import adminpropertyRouter from "./adminpropertyRouter.js";
import adminrentpropertyRouter from "./adminrentpropertyRouter.js";

const adminRouter = Router();

adminRouter.use("/property", adminpropertyRouter);
adminRouter.use("/rentproperty", adminrentpropertyRouter);

export default adminRouter;
