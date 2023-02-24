const { UserModel } = require("../model/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const { cloudinaryConfig } = require("../config/cloudinary.config");

const getAllusers = async (req, res) => {
  const userID = req.body.userID;
  const { mobile, email, name, text_query } = req.query;
  try {
    const user = await UserModel.findById(userID);
    if (user && user.role === "admin") {
      let allusers = [];
      if (text_query) {
        allusers = await UserModel.find({
          role: "users",
          $text: { $search: text_query },
        });
      } else {
        const query = {};
        if (mobile) {
          query.mobile = { $regex: new RegExp(mobile, "i") };
        }
        if (email) {
          query.email = { $regex: new RegExp(email, "i") };
        }
        if (name) {
          query.name = { $regex: new RegExp(name, "i") };
        }
        allusers = await UserModel.find(query);
      }
      res.status(200).send({ msg: "Welcome Admin Home Page", allusers });
    } else {
      // console.log("all users", users);
      res.status(400).send({ msg: "Sorry You are not a admin" });
    }
  } catch (err) {
    res.status(400).send({ msg: "Somthing went wrong" });
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, pass, mobile, role, address } = req.body;

    // Check if user already exists
    const userExists = await UserModel.findOne({ email });
    if (userExists) {
      return res.status(400).send({ error: "User already exists" });
    }

    // 1.) Create new user
    // a.)password hashing
    bcrypt.hash(pass, 5, async (err, hash) => {
      if (err) {
        res
          .status(400)
          .send({ message: "Somthing went wrong", err: err.message });
        return;
      }
      // console.log("hash", hash);
      const new_user = new UserModel({
        name,
        email,
        pass: hash,
        mobile,
        role,
        address,
      });

      // Save user to database
      await new_user.save();
      res.status(201).send({ message: "User Registered", new_user });
    });
  } catch (err) {
    res.status(400).send({ msg: "Somthing went wrong", err: err.message });
  }
};

const userLogin = async (req, res) => {
  const { email, pass } = req.body;
  try {
    const userExists = await UserModel.findOne({ email });

    if (userExists) {
      bcrypt.compare(pass, userExists.pass, async function (err, result) {
        if (result) {
          const token = jwt.sign(
            { ExistingUserID: userExists._id },
            process.env.SECRET_KEY
          );
          // console.log("login l-101", userExists.isActive);
          userExists.isActive = true;
          await userExists.save();
          res.status(200).send({ msg: "Login Successfull", token: token });
        } else {
          res.status(401).send("Wrong Credntials");
        }
      });
    } else {
      res.status(401).send("Login Faild");
    }
  } catch (err) {
    res.status(400).send({ msg: "Somthing went wrong", err: err.message });
  }
};

const userLogout = async (req, res) => {
  try {
    const user = await UserModel.findByIdAndUpdate(req.body.userID);
    // console.log("user logout l-88", user);
    if (!user) {
      return res.status(404).send("User not found");
    }
    user.isActive = false;
    await user.save();
    res.status(200).send("Logout Successful");
  } catch (err) {
    console.error(err);
    res.status(400).send({ msg: "Something went wrong", err: err.message });
  }
};

const userUpdateProfile = async (req, res) => {
  const { name, mobile, city, area, district, state, pinCode, addressId } =
    req.body;
  try {
    // Find the user by ID
    const user = await UserModel.findById(req.body.userID);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newAddress = {
      city,
      area,
      district,
      state,
      pinCode,
    };

    // Only update the name, mobile, and image fields if they are provided
    if (name) user.name = name;
    if (mobile) user.mobile = mobile;

    //upload profile pic of user
    if (user.image === "" || user.image === null) {
      if (req.files.image) {
        const file = req.files.image;
        cloudinary.uploader.upload(file.tempFilePath, async (err, result) => {
          if (err) {
            return res
              .status(400)
              .send({ massage: "Image file is not uploaded" });
          }
          console.log("result url", result.url);
          user.image = result.url;
          await user.save();
        });
      }
    }

    // if (city || area || district || state || pinCode) {
    // Find the index of the address with the given ID
    const addressIndex = user.address.findIndex(
      (a) => a._id.toString() === addressId
    );
    console.log("id matched L-148", addressIndex);
    if (addressIndex !== -1) {
      // If the address exists, update it
      user.address[addressIndex] = newAddress;
      await user.save();
      res.send(
        `Hello!, ${user.name}, your old address ${addressId} has been updated. The new address is ${newAddress}.`
      );
    } else {
      // If the address doesn't exist, add it to the array
      user.address.push(newAddress);
      await user.save();
      res.send(`Hello!, ${user.name}, your new address has been added.`);
    }
    // }
    res
      .status(200)
      .send(`Hello!, ${user.name}, your profile has been updated.`);
  } catch (err) {
    return res.json({ message: "Something went wrong updating profile" });
  }
};

const userDeleteAddress = async (req, res) => {
  const userId = req.body.userID;
  const addressId = req.body.addressID;
  // console.log("line-150", addressId);
  try {
    // Find the user by ID
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // address length should not be lessthen 1

    if (user.address.length > 1) {
      // Find the index of the address with the given ID
      const addressIndex = user.address.findIndex(
        (ele) => ele._id.toString() === addressId
      );
      // console.log(addressIndex);
      if (addressIndex === -1) {
        return res.status(404).json({ message: "Address not found" });
      }
      // Remove the address from the user's address array
      user.address.splice(addressIndex, 1);
      // Update the user document in the database
      await UserModel.findByIdAndUpdate(userId, { address: user.address });
      res.send(
        `Address with ID ${addressId} has been deleted from the user's address list.`
      );
    } else {
      return res.json({ message: "Sorry you can't Delete default address" });
    }
  } catch (err) {
    return res.json({ message: "Something went wrong deleting address" });
  }
};

module.exports = {
  getAllusers,
  registerUser,
  userLogin,
  userLogout,
  userUpdateProfile,
  userDeleteAddress,
};
