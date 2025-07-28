import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandeler } from "../utils/asyncHandeler.js";

// async is for handeling database 

const healthcheck = asyncHandeler(async (req , res) => {
    return res
    .status(200)
    .json(new ApiResponse(200 , "OK" , "Health Check Passed"))
})

export {healthcheck}