import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      require: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      require: true,
      unique: true,
      trim: true,
    },
    fullname: {
      type: String,
      require: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary URL
      require: true,
    },
    coverImage: {
      type: String, // cloudinary URL
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {timestamps : true}
);

// encrypting the password bcrypt 
userSchema.pre("save" , async function(next){
  if(!this.isModified("password")) return next()
  this.password = await bcrypt.hash(this.password , 10)
  next()
})

userSchema.methods.isPasswordCorrect = async function (password){
  return await bcrypt.compare(password , this.password)
}

userSchema.methods.generateAccessToken = function(){
  // Short lived token
  return jwt.sign({
    _id : this._id,
    email : this.email,
    username : this.username,
    fullname : this.fullname
  } , 
  process.env.ACCESS_TOKEN_SECRET,
  { expiresIn : process.env.ACCESS_TOKEN_EXPIRY } 
)
}
userSchema.methods.generateRefreshToken = function(){
  // Short lived token
  return jwt.sign({
    _id : this._id
  } , 
  process.env.REFRESH_TOKEN_SECRET,
  { expiresIn : process.env.REFRESH_TOKEN_EXPIRY }
)
}

export const User = mongoose.model("User", userSchema);
