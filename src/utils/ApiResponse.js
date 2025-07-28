class ApiResponse {
    constructor(statusCode , data , messg = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.messg = messg
        this.success = statusCode < 400
    }
}

export {ApiResponse}