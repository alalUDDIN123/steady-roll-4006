const express = require("express");
// const {validateUserData}=require("../middleware/userFieldAnalyzer.middleware")
const {
  registerUser,
  getAllusers,
  userLogin,
  userLogout,
  userUpdateProfile,
  forgetPassword,
  usergetProfile,
  userDeleteAddress,
  ChangePassword,
} = require("../controllers/user.controller");
const adminAccesssOnly = require("../middleware/admin.middleware");
const { authenticateToken } = require("../middleware/userAuth.middleware");
const {
  userSignupInputValidate,
  userLoginInput,
  profileInput
} = require("../middleware/userFieldAnalyzer.middleware");

const userRoutes = express.Router();

userRoutes.get("/", authenticateToken, adminAccesssOnly, getAllusers); //ok
userRoutes.post("/register", userSignupInputValidate, registerUser); //ok
userRoutes.post("/login", userLoginInput, userLogin); //ok
userRoutes.post("/logout", authenticateToken, userLogout) //ok
userRoutes.get("/profile", authenticateToken, usergetProfile) //ok
userRoutes.patch("/profile/update", authenticateToken,  userUpdateProfile) 
userRoutes.delete("/delete/address", authenticateToken,userDeleteAddress);
userRoutes.patch("/password/change", authenticateToken, ChangePassword)
userRoutes.patch("/password/forget",  forgetPassword)


module.exports = {
  userRoutes,
};
