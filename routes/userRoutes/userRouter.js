import { Router } from "express";
import usercontactRouter from "./usercontactRouter.js";
import usersellpropertyRouter from "./usersellpropertyRouter.js";
import userpropertyRouter from "./userpropertyRouter.js";
import userteamRouter from "./userteamRouter.js";

const userRouter = Router();

userRouter.use("/contact", usercontactRouter);
userRouter.use("/sellproperty", usersellpropertyRouter);
userRouter.use("/property", userpropertyRouter);
userRouter.use("/team", userteamRouter);

export default userRouter;
