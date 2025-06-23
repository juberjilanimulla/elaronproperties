import { Router } from "express";
import adminpropertyRouter from "./adminpropertyRouter.js";
import adminrentpropertyRouter from "./adminrentpropertyRouter.js";
import adminoffplanpropertyRouter from "./adminoffplanpropertyRouter.js";
import adminnewsRouter from "./adminnewsRouter.js";
import adminteamRouter from "./adminteamRouter.js";

const adminRouter = Router();

adminRouter.use("/property", adminpropertyRouter);
adminRouter.use("/rentproperty", adminrentpropertyRouter);
adminRouter.use("/offplanproperty", adminoffplanpropertyRouter);
adminRouter.use("/news", adminnewsRouter);
adminRouter.use("/team", adminteamRouter);
adminRouter.use("/marketoverview");
export default adminRouter;
