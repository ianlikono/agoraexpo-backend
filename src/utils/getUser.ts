import { Context } from "../types";

export const APP_SECRET = "appsecret321";

export function getUserId(context: Context) {
  const userId = context.request.session.userId;
  if (userId) {
    return userId;
  }
}
