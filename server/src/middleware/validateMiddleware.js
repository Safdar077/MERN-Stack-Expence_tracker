/**
 * Request Validation Middleware
 * 
 * A reusable Express middleware factory that validates incoming HTTP request bodies
 * against a specified Zod schema.
 * 
 * If validation succeeds, `req.body` is updated with the cleaned/parsed data,
 * and execution passes to the next middleware or controller.
 * If validation fails, the thrown ZodError is passed to `next(error)`, which is
 * intercepted by the centralized `errorHandler` and formatted into a 400 Bad Request response.
 */

/**
 * Creates a middleware function that validates `req.body` against a Zod schema.
 * 
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @returns {import('express').RequestHandler} Express request handler
 */
const validate = (schema) => (req, res, next) => {
  try {
    // parse() validates and strips or transforms fields as defined in the schema
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    // Pass validation error down to centralized errorMiddleware
    next(error);
  }
};

module.exports = validate;
