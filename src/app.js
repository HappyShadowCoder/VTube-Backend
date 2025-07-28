import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
const app = express()

app.use(
    cors({
        origin : process.env.CORS_ORIGIN,
        credentials : true
    })
)

// Common Middlewear
app.use(express.json({limit : "16kb"}))
app.use(express.urlencoded({extended : true , limit : "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// import routes
import healthcheckRouter from "./routes/healtcheck.routes.js"
import userRouter from "./routes/user.routes.js"
import { errorHandeler } from "./middlewears/error.middlewears.js"
// routes
app.use("/api/v1/healthcheck" , healthcheckRouter)
app.use("/api/v1/users" , userRouter)
app.use(errorHandeler)

export { app }