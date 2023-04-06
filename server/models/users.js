const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  about: {
    type: String,
  },
  password: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
    required: true,
  },
  linkedIn: {
    type: String,
  },
  github: {
    type: String,
  },
  facebook: {
    type: String,
  },
  twitter: {
    type: String,
  },
  instagram: {
    type: String,
  },
  website: {
    type: String,
  },
  education: {
    type: String,
  },
  profession: {
    type: String,
  },
  interests: [
    {
      type: String,
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
