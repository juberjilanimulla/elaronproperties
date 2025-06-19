import { Router } from "express";
import adminpropertyRouter from "./adminpropertyRouter.js";
import adminrentpropertyRouter from "./adminrentpropertyRouter.js";
import adminoffplanpropertyRouter from "./adminoffplanpropertyRouter.js";

const adminRouter = Router();

adminRouter.use("/property", adminpropertyRouter);
adminRouter.use("/rentproperty", adminrentpropertyRouter);
adminRouter.use("/offplanproperty", adminoffplanpropertyRouter);

export default adminRouter;
