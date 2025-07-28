import { asyncHandeler } from "../utils/asyncHandeler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary , deleteFromCloudinary} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";


const genrateAccessAndRefresh = async (userId) =>{
    try {
        const user = await User.findById(userId)
        // Small Check for User Existence
        if(!user) throw new ApiError(404, "User not found");
    
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
    
        user.refreshToken = refreshToken;
        await user.save({validBeforeSave: false});
    
        return {accessToken,refreshToken}
    } catch (error) {
        console.error("Error generating tokens:", error);
        throw new ApiError(500, "Failed to generate tokens");
    }
    
}

const registerUser = asyncHandeler( async (req , res) => {
    const {fullname , email , username , password} = req.body

    // Validation
    if([fullname , email , username , password].some((field) => field?.trim() === "")){
        throw new ApiError(400 , "All field are required")
    }

    const existedUser = await User.findOne({
        $or: [{ email },{ username }]
    })

    if(existedUser){
        throw new ApiError(400 , "User already exists with this email or username")
    }

    console.warn(req.files);
    const avatartLocalPath = req.files?.avatar?.[0]?.path 
    const coverLocalPath = req.files?.coverImage?.[0]?.path

    if(!avatartLocalPath || !coverLocalPath){
    throw new ApiError(400 , "Avatar and Cover Image are required")
}

    let avatar ;
    try {
        avatar = await uploadOnCloudinary(avatartLocalPath)
        console.log("Avatar uploaded successfully");
        
    } catch (error) {
        console.log("Error uploading avatar to Cloudinary:", error);
        throw new ApiError(500, "Failed to upload avatar image");
    }
    let coverImage ;
    try {
        coverImage = await uploadOnCloudinary(coverLocalPath)
        console.log("Cover image uploaded successfully");

    } catch (error) {
        console.log("Error uploading cover image to Cloudinary:", error);
        throw new ApiError(500, "Failed to upload cover image");
    }

    try {
        const user = await User.create({
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username : username.toLowerCase()
        })
    
        const createdUser = await User.findById(user._id).select("-password -refreshToken")
        if(!createdUser){
            throw new ApiError(500 , "Something went wrong while creating user")
        }
    
        return res.status(201).json(
            new ApiResponse(200 , createdUser , "User registered successfully")
        )
    } catch (error) {
        console.log("Error creating user:", error);
        if(avatar){
            await deleteFromCloudinary(avatar.public_id);
        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id);
        }
        throw new ApiError(500, "Failed to create user");
    }
})

const loginUser = asyncHandeler( async (req , res) => {
    // Get Data from body
    const {email , username , password} = req.body

    // Validation
    if(!email){
        throw new ApiError(400 , "Email is required")
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    })

    if(!user){
        throw new ApiError(404 , "User not found")
    }

    // Validate Password
    const isPasswordCorrect = await user.isPasswordCorrect(password)
    if(!isPasswordCorrect){
        throw new ApiError(400 , "Invalid Password")
    }

    const { accessToken, refreshToken } = await genrateAccessAndRefresh(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    if(!loggedInUser){
        throw new ApiError(500 , "Something went wrong while logging in")
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
        .status(200)
        .cookie("accessToken", refreshToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken }, "User logged in successfully"));
})

const logoutUser = asyncHandeler( async (req , res) => {
    await User.findByIdAndUpdate(
        // ToDo : Need to come back here after middlewars
        req.user._id,
        { $set: {refreshToken : undefined, } },
        { new: true }
    )  

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
})

const refreshAccessToken = asyncHandeler(async (req , res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(400, "Refresh token is required");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid refresh token");
        }

        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Invalid refresh token");
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        }

        const { accessToken , refreshToken : newRefreshToken} = await genrateAccessAndRefresh(user._id)

        return res
            .status(200)
            .cookie("accessToken", newRefreshToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { user, accessToken }, "Access token refreshed successfully"));
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token");
    }
})

const changeCurrentPasswod = asyncHandeler(async (req, res) => {
    const {oldPassword, newPassword} = req.body;
    const user = await User.findByIdAndUpdate(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordValid){
        throw new ApiError(400, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({validBeforeSave: false});

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
})

const getCurrentUser = asyncHandeler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
})

const updateAccountDetails = asyncHandeler(async (req, res) => {
    const {fullname, email} = req.body;
    
    if(!fullname || !email){
        throw new ApiError(404, "Fullname and email are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullname, email : email } },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
})

const updateUserAvatar = asyncHandeler(async (req, res) => {
    const avatarLocalPath = req.files?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url ){
        throw new ApiError(400, "Failed to upload avatar image");
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {avatar: avatar.url}
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    res.status(200).json(
        new ApiResponse(200, {avatar: avatar.url}, "Avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandeler(async (req, res) => {
    const coverImageLocalPath = req.files?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400 , "Failed to upload cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {coverImage: coverImage.url}
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    res.status(200).json(
        new ApiResponse(200, user ,  "Cover image updated successfully")
    )
})

const getUserChannelProfile = asyncHandeler(async (req, res) => {
     const {username} = req.params;
    if(!username?.trim()){  
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscriberCount : {$size : "$subscribers"},
            },
            channelSubscribed : {
                $size : "$subscribedTo"
            },
            isSubscribedCount : {
                $cond: {
                    if: { $in: [req.user?._id, "$subscribedTo.subscriber"] },
                    then: true,
                    else: false
                }
            }
        },
        {
            // Project only the necessary fields
            $project : {
                fullname: 1,
                username: 1,
                avatar: 1,
                subscriberCount: 1,
                channelSubscribedCount : 1,
                isSubscribedCount: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"));
})

const getWatchHistory = asyncHandeler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline : [
                                {
                                    $project : {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    }]
            }
        },
        {
            $addFields : {
                $first : "$owner"
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, user[0]?.watchHistory || [], "Watch history fetched successfully"));
})

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPasswod,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}