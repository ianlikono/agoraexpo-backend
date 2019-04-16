import { idArg, queryType, stringArg } from "nexus";
import { getUserId } from "../utils/getUser";

export const Query = queryType({
  definition(t) {
    t.field("me", {
      type: "User",
      resolve: (parent, args, ctx) => {
        const userId = getUserId(ctx);
        if (userId) {
          return ctx.prisma.user({ id: userId });
        } else {
          return null;
        }
      }
    });
    t.field("shop", {
      type: "Shop",
      args: { id: idArg() },
      resolve: (parent, { id }, ctx) => {
        return ctx.prisma.shop({ id });
      }
    });
    t.field("product", {
      type: "Product",
      args: { id: idArg() },
      resolve: (parent, { id }, ctx) => {
        return ctx.prisma.product({ id });
      }
    });
    t.list.field("filterCategories", {
      type: "Category",
      args: {
        searchString: stringArg()
      },
      resolve: (parent, { searchString }, ctx) => {
        return ctx.prisma.categories({
          where: {
            OR: [{ name_contains: searchString }]
          }
        });
      }
    });
    t.list.field("filterUsers", {
      type: "User",
      args: {
        searchString: stringArg()
      },
      resolve: (parent, { searchString }, ctx) => {
        return ctx.prisma.users({
          where: {
            OR: [
              { name_contains: searchString },
              { username_contains: searchString }
            ]
          }
        });
      }
    });

    t.list.field("productReviews", {
      type: "ProductReview",
      args: {
        productId: idArg({ required: true })
      },
      resolve: (parent, { productId }, ctx) => {
        return ctx.prisma.productReviews({
          where: {
            product: { id: productId }
          }
        });
      }
    });

    t.list.field("getMeCart", {
      type: "Cart",
      resolve: (parent, { productId }, ctx) => {
        const userId = getUserId(ctx);
        return ctx.prisma.carts({
          where: {
            user: {
              id: userId
            }
          }
        });
      }
    });
  }
});
