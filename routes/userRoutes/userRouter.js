import { Router } from "express";
import usercontactRouter from "./usercontactRouter.js";
import usersellpropertyRouter from "./usersellpropertyRouter.js";

const userRouter = Router();

userRouter.use("/contact", usercontactRouter);
userRouter.use("/sellproperty", usersellpropertyRouter);

export default userRouter;
