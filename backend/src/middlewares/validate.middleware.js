import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

/**
 * validate middleware
 * Place this AFTER the express-validator chains in the route definition:
 *   router.post('/route', [...validationChain], validate, controller)
 *
 * Collects all validation errors and throws a 400 ApiError with the full list.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
        }));

        return next(new ApiError(400, "Validation failed", errorMessages));
    }

    next();
};

export default validate;
