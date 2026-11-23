class ApiResponse {
    constructor(statusCode, data, message = "Success", pagination = null) {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
        // Only attach pagination when provided (paginated list endpoints)
        if (pagination) {
            this.pagination = pagination;
        }
    }
}

export default ApiResponse;
