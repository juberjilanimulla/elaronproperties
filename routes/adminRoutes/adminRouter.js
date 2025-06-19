import { Router } from "express";
import adminpropertyRouter from "./adminpropertyRouter.js";

const adminRouter = Router();

adminRouter.use("/property", adminpropertyRouter);

export default adminRouter;
