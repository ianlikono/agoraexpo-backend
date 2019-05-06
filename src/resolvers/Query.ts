import { idArg, intArg, queryType, stringArg } from "nexus";
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
    t.list.field("filterForums", {
      type: "Forum",
      args: {
        searchString: stringArg()
      },
      resolve: (parent, { searchString }, ctx) => {
        return ctx.prisma.forums({
          where: {
            OR: [{ name_contains: searchString }]
          }
        });
      }
    });
    t.field("forumPost", {
      type: "ForumPost",
      args: { id: idArg() },
      resolve: (parent, { id }, ctx) => {
        return ctx.prisma.forumPost({ id });
      }
    });

    t.list.field("forumPostComments", {
      type: "ForumPostComment",
      args: {
        postId: idArg({ required: true })
      },
      resolve: (parent, { postId }, ctx) => {
        return ctx.prisma.forumPostComments({
          where: {
            forumPost: { id: postId }
          }
        });
      }
    });

    t.list.field("forums", {
      type: "ForumPost",
      args: {
        limit: intArg({ required: false })
      },
      resolve: (parent, { limit }, ctx) => {
        return ctx.prisma.forumPosts({
          first: limit
        });
      }
    });

    t.list.field("forumPosts", {
      type: "ForumPost",
      args: {
        forumName: stringArg({ required: true })
      },
      resolve: (parent, { forumName }, ctx) => {
        return ctx.prisma.forumPosts({
          where: { forum: { name: forumName } }
        });
      }
    });

    t.list.field("getShopProducts", {
      type: "Product",
      args: {
        shopId: idArg({ required: true })
      },
      resolve: async (_, { shopId }, ctx) => {
        const products = await ctx.prisma.products({
          where: { shop: { id: shopId } }
        });
        return products;
      }
    });
    t.list.field("getUser", {
      type: "User",
      args: {
        username: stringArg({ required: true })
      },
      resolve: async (_, { username }, ctx) => {
        const user = await ctx.prisma.users({
          where: {
            username: username
          }
        });
        return user;
      }
    });
    t.list.field("getUserForums", {
      type: "Forum",
      args: {
        username: stringArg({ required: true })
      },
      resolve: async (_, { username }, ctx) => {
        const forums = await ctx.prisma.forums({
          where: {
            members_every: { username: username }
          }
        });
        return forums;
      }
    });
    t.list.field("getUserPosts", {
      type: "ForumPost",
      args: {
        username: stringArg({ required: true })
      },
      resolve: async (_, { username }, ctx) => {
        const forums = await ctx.prisma.forumPosts({
          where: {
            postedBy: { username: username }
          }
        });
        return forums;
      }
    });
  }
});
