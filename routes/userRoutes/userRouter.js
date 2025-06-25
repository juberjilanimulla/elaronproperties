import { Router } from "express";
import usercontactRouter from "./usercontactRouter.js";
import usersellpropertyRouter from "./usersellpropertyRouter.js";
import userpropertyRouter from "./userpropertyRouter.js";
import userteamRouter from "./userteamRouter.js";
import useroffplanRouter from "./useroffplanRouter.js";
import userrentRouter from "./userrentRouter.js";
import usernewsRouter from "./usernewsRouter.js";
import usermarketoverviewRouter from "./usermarketoverviewRouter.js";
import userbrochureRouter from "./userbrochureRouter.js";

const userRouter = Router();

userRouter.use("/contact", usercontactRouter);
userRouter.use("/sellproperty", usersellpropertyRouter);
userRouter.use("/property", userpropertyRouter);
userRouter.use("/team", userteamRouter);
userRouter.use("/offplan", useroffplanRouter);
userRouter.use("/rent", userrentRouter);
userRouter.use("/news", usernewsRouter);
userRouter.use("/marketoverview", usermarketoverviewRouter);
userRouter.use("/brochure", userbrochureRouter);
export default userRouter;
