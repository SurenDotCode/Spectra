import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
    message = "This request could not be completed.",
  ) {
    super(message);
  }
}
export function publicError(error: unknown) {
  if (error instanceof ZodError)
    return {
      error: "Check the request fields and try again.",
      code: "INPUT",
      status: 400,
    };
  if (error instanceof AppError)
    return { error: error.message, code: error.code, status: error.status };
  return {
    error: "Something interrupted this request. Please try again.",
    code: "INTERNAL",
    status: 500,
  };
}
