import express from "express";
import config from "./config.js";
import dbConnect from "./db.js";
import userRouter from "./routes/userRoutes/userRoutes.js";
import cors from "cors";
import morgan from "morgan";

const app = express();
const port = config.PORT;

//routes
app.use("/api/user", userRouter);

//database connection
dbConnect()
  .then(() => {
    app.listen(port, () => {
      console.log(`server is listening at ${port} port`);
    });
  })
  .catch(() => {
    console.log("unable to connected to server");
  });
