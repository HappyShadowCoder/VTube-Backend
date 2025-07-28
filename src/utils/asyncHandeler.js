// Maker Error and Response Standarlized : Will help save time
const asyncHandeler = (requestHandler) => {
    return (req , res , next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    }
}

export {asyncHandeler}