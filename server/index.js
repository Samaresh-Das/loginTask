require("dotenv").config({ path: "./.env" });
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const HttpError = require("./models/http-error");
const usersRoute = require("./routes/user-routes");

const app = express();

app.use(bodyParser.json());
app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/user", usersRoute);

app.get("/", (req, res, next) => {
  res.status(200).json({ message: "Server running" });
});

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

app.use((error, req, res, next) => {
  // if (req.file) {
  //   //deleting the image if any error happens or rolling it back
  //   fs.unlink(req.file.path, (err) => {
  //     console.log(err);
  //   });
  // }
  // if (res.headerSent) {
  //   return next(error);
  // }
  res.status(error.code || 500).json({
    message: error.message || "An unknown error occurred",
  });
});

mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(process.env.PORT);
  })
  .catch((err) => {
    console.log(err);
  });
