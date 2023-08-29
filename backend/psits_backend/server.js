import "express-async-errors";
import cors from "cors";
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";

import config from "./src/utils/Config.js";
import database from "./src/MongoDB.js";

// routers
import v2AuthRouter from "./src/routes/authRouter.js";
import v2UserRouter from "./src/routes/userRouter.js";
import v2AnnouncementRouter from "./src/routes/announcementRouter.js";
import v2EventRouter from "./src/routes/eventRouter.js";

import homeRouter from "./src/routes/main.js";
import authRouter from "./src/routes/auth.js";
import userRouter from "./src/routes/users.js";
import annoucementRouter from "./src/routes/announcement.js";
import eventRouter from "./src/routes/events.js";
import merchandiseRouter from "./src/routes/merchandise.js";
import orderRouter from "./src/routes/orders.js";
import officeLogRouter from "./src/routes/officelog.js";

// middleware
import { authenticateUser } from "./src/middlewares/authMiddleware.js";
import errorHandlerMiddleware from "./src/middlewares/errorHandlerMiddleware.js";

const app = express();

let PORT = config.PORT;

// run database
database();

// middlewares
app.use(cookieParser()); // allow node to read cookies
app.use(express.json()); // uses JSON as payload
app.use(compression()); // compresses all routes

// cors
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);

// routes
app.use("/", homeRouter);
app.use("/api/auth/v2", v2AuthRouter);
app.use("/api/user/v2", authenticateUser, v2UserRouter);
app.use("/api/announcement/v2", v2AnnouncementRouter);
app.use("/api/event/v2", v2EventRouter);

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/announcement", annoucementRouter);
app.use("/api/event", eventRouter);
app.use("/api/merch", merchandiseRouter);
app.use("/api/order", orderRouter);
app.use("/api/officelog", officeLogRouter);

// throw error in json format if route not exist
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found!" });
});

// throw all error in json format to not to crash the server
app.use(errorHandlerMiddleware);

// run the app
const server = app.listen(PORT, () => {
  console.log(`Server has started, running on port: ${PORT}`);
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
