import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs"
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath , {
            resource_type : "auto"
        })
        console.log("File Uploaded In Cloudinary. File Src : " + response.url)
        // Once the file is uploaded , we would like to delete it from our server
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlink(localFilePath)
        return null
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        if(!publicId) return null
        const result = await cloudinary.uploader.destroy(publicId);
        console.log("File Deleted From Cloudinary. File Src : " + publicId);
        return result;
    } catch (error) {
        console.error("Error deleting file from Cloudinary:", error);
        return null;
    }
}

export { uploadOnCloudinary , deleteFromCloudinary}