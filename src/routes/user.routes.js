import { Router } from "express";
import {logoutUser, registerUser , loginUser, refreshAccessToken, changeCurrentPasswod, getCurrentUser, updateAccountDetails , getUserChannelProfile , updateUserAvatar , updateUserCoverImage , getWatchHistory} from "../controllers/user.controllers.js"
import { upload } from "../middlewears/multer.middlewears.js"
import { verifyJWT } from "../middlewears/auth.middlewears.js";

const router = Router()

// Unsecured Routes
router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },{
            name : "coverImage",
            maxCount : 1
        }
    ]),
    registerUser)
router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

// Secured Routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/change-password").post(verifyJWT, changeCurrentPasswod)
router.route("/current-user").get(verifyJWT , getCurrentUser)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT , upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT , upload.single("coverImage"), updateUserCoverImage)
router.route("/watch-history").get(verifyJWT, getWatchHistory)


export default router