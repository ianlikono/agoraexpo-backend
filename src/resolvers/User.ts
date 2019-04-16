import { prismaObjectType } from "nexus-prisma";

export const User = prismaObjectType({
  name: "User",
  definition(t) {
    t.prismaFields([
      "id",
      "name",
      "email",
      "username",
      "profilePic",
      "firebaseId",
      "isAnonymous",
      "emailVerified",
      {
        name: "shops",
        args: [] // remove the arguments from the `posts` field of the `User` type in the Prisma schema
      },
      {
        name: "images"
      }
    ]);
  }
});
