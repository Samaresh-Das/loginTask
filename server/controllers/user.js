const HttpError = require("../models/http-error");
const User = require("../models/users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const fs = require("fs");
const mongoose = require("mongoose");
// const {
//   S3Client,
//   PutObjectCommand,
//   GetObjectCommand,
//   DeleteObjectCommand,
// } = require("@aws-sdk/client-s3");
// const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// const bucketName = process.env.BUCKET_NAME;
// const bucketRegion = process.env.BUCKET_REGION;
// const accessKey = process.env.ACCESS_KEY;
// const secretAccesskey = process.env.SECRET_ACCESS_KEY;

// const s3 = new S3Client({
//   credentials: {
//     accessKeyId: accessKey,
//     secretAccessKey: secretAccesskey,
//   },
//   region: bucketRegion,
// });

const linkSite = "https://dev-blog-p5s9.onrender.com/";
//https://dev-blog-p5s9.onrender.com/
//http://localhost:5000/

const defaultImageUrl =
  "https://static.vecteezy.com/system/resources/previews/008/442/086/original/illustration-of-human-icon-user-symbol-icon-modern-design-on-blank-background-free-vector.jpg";

const createNewUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }

  const { firstName, lastName, email, password, phone } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Signup failed", 500);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("Could not signup, user already exists", 422);
    return next(error);
  }

  //hashing the password
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not signup, please try again", 500);
    return res.status(500).json({
      message: error.message,
    });
  }

  let createdUser;
  try {
    createdUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone: phone || null,
      profilePicture: defaultImageUrl,
    });

    await createdUser.save();
  } catch (err) {
    const error = new HttpError("User creation failed", 500);
    return res.status(500).json({
      message: error.message || "An unknown error occurred",
    });
  }

  // generating jwt token
  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.SESSION_KEY,
      { expiresIn: "2h" }
    );
  } catch (err) {
    const error = new HttpError("Could not create user", 500);
    return res.status(422).json({
      message: error.message,
    });
  }

  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    profilePicture: createdUser.profilePicture,
    token: token,
  });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email }); //finding the user with mail ID in db
  } catch (err) {
    const error = new HttpError("Login failed", 500);
    return res.status(500).json({
      message: error.message,
    });
  }

  if (!existingUser) {
    //if no user found give error
    const error = new HttpError("Invalid credentials", 401);
    return res.status(401).json({
      message: error.message,
    });
  }

  //checking password validity
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError("Unknown error occurred", 422);
    return res.status(422).json({
      message: error.message,
    });
  }

  if (!isValidPassword) {
    const error = new HttpError("Invalid credentials", 401);
    return res.status(401).json({
      message: error.message,
    });
  }

  //generating jwt token
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
        profilePicture: existingUser.profilePicture,
      },
      process.env.SESSION_KEY,
      { expiresIn: "2h" }
    );
  } catch (err) {
    const error = new HttpError("Login failed", 500);
    return res.status(500).json({
      message: error.message,
    });
  }

  res.status(200).json({
    userId: existingUser.id,
    email: existingUser.email,
    message: "Successfully logged in",
    token: token,
    profilePicture: existingUser.profilePicture,
  });
};

const getUserById = async (req, res, next) => {
  const userId = req.userData.userId;

  let user;
  try {
    user = await User.findById(userId).select("-password");
  } catch (err) {
    const error = new HttpError("User not found", 404);
    return next(error);
  }
  if (!user) {
    const error = new HttpError("User not found", 404);
    return next(error);
  }

  // const getObjectParams = {
  //   Bucket: bucketName,
  //   Key: user.profilePicture,
  // };
  // const command = new GetObjectCommand(getObjectParams);
  // const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  // user.profilePicture = url;
  // await user.save();
  res.status(200).json(user.toObject({ getters: true }));
  // if (req.user && req.user.id === userId) {
  //   const user = await User.findById(userId).select("-password");
  //   if (!user) {
  //     res.status(404).send("User not found");
  //   } else {
  //     res.json(user);
  //   }
  // } else {
  //   res.status(401).send("Unauthorized");
  // }
};

const updateUserById = async (req, res, next) => {
  const userId = req.userData.userId;
  const { name, email, tagline } = req.body;
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError("User not found", 404);
    return next(error);
  }
  if (!user) {
    const error = new HttpError("User not found", 404);
    return next(error);
  }

  //the user might not want to update all the fields so we used the OR operator.
  user.name = name || user.name;
  user.email = email || user.email;
  user.tagline = tagline || user.tagline;
  let newProfilePicture;
  if (req.file) {
    if (user.profilePicture !== defaultImageUrl) {
      //if the user updates the profile picture, the last profile picture will be deleted and new will be added in the s3 bucket
      const profileImage = user.profilePicture.replace(
        "https://sam-dev-blog.s3.ap-south-1.amazonaws.com/",
        ""
      );
      const deleteParams = {
        Bucket: bucketName,
        Key: profileImage,
      };
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);

      //replace the image with the new one
      const replaceParams = {
        Bucket: bucketName,
        Key: req.file.originalname,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const replaceCommand = new PutObjectCommand(replaceParams);
      await s3.send(replaceCommand);
      newProfilePicture = `https://sam-dev-blog.s3.ap-south-1.amazonaws.com/${req.file.originalname}`;
      user.profilePicture = newProfilePicture;
    } else {
      //if the user updating the image for the first time
      const params = {
        Bucket: bucketName,
        Key: req.file.originalname,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      const command = new PutObjectCommand(params);
      await s3.send(command);
      newProfilePicture = `https://sam-dev-blog.s3.ap-south-1.amazonaws.com/${req.file.originalname}`;
      user.profilePicture = newProfilePicture;
    }
  } else {
    user.profilePicture = user.profilePicture;
  }

  let updatedUser;
  try {
    updatedUser = await user.save();
  } catch (err) {
    const error = new HttpError("Could not update the user details", 500);
    return next(error);
  }
  res.status(200).json(updatedUser.toObject({ getters: true }));
};

const deleteUser = async (req, res, next) => {
  const userId = req.userData.userId;
  let deletedUser;
  const sess = await mongoose.startSession();
  try {
    sess.startTransaction();
    let user;
    user = await User.findById(userId).populate("posts");
    if (!user) {
      const error = new HttpError("Could not find this user", 500);
      return next(error);
    }
    if (user.profilePicture !== defaultImageUrl) {
      const key = user.profilePicture.replace(
        "https://sam-dev-blog.s3.ap-south-1.amazonaws.com/",
        ""
      );
      const params = {
        Bucket: bucketName,
        Key: key,
      };
      const command = new DeleteObjectCommand(params);
      const ress3 = await s3.send(command);
    }

    for (const postId of user.posts) {
      const post = await Post.findById(postId);
      if (!post) continue;
      //deleting the post image from s3 bucket
      const imagePath = post.image.replace(
        "https://sam-dev-blog.s3.ap-south-1.amazonaws.com/",
        ""
      );
      const deleteParams = {
        Bucket: bucketName,
        Key: imagePath,
      };
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);

      await post.remove({ session: sess });
    }
    deletedUser = await user.remove({ session: sess });

    await sess.commitTransaction();
  } catch (err) {
    await sess.abortTransaction();
    const error = new HttpError("Could not delete the user", 500);
    return next(error);
  }

  res.status(200).json({
    message: "Deleted",
    deletedUser: deletedUser.toObject({ getters: true }),
  });
};

module.exports = {
  createNewUser,
  login,
  getUserById,
  updateUserById,
  deleteUser,
};
