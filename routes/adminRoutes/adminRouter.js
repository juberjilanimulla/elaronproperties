import { Router } from "express";
import adminpropertyRouter from "./adminpropertyRouter.js";
import adminrentpropertyRouter from "./adminrentpropertyRouter.js";
import adminoffplanpropertyRouter from "./adminoffplanpropertyRouter.js";
import adminnewsRouter from "./adminnewsRouter.js";
import adminteamRouter from "./adminteamRouter.js";
import adminmarketoverviewRouter from "./adminmarketoverviewRouter.js";
import admincontactRouter from "./admincontactRouter.js";
import adminbrochureRouter from "./adminbrochureRouter.js";
import adminsellpropertyRouter from "./adminsellpropertyuserRouter.js";

const adminRouter = Router();

adminRouter.use("/property", adminpropertyRouter);
adminRouter.use("/rentproperty", adminrentpropertyRouter);
adminRouter.use("/offplanproperty", adminoffplanpropertyRouter);
adminRouter.use("/news", adminnewsRouter);
adminRouter.use("/team", adminteamRouter);
adminRouter.use("/marketoverview", adminmarketoverviewRouter);
adminRouter.use("/contact", admincontactRouter);
adminRouter.use("/brochure", adminbrochureRouter);
adminRouter.use("/sellproperty", adminsellpropertyRouter);

export default adminRouter;
