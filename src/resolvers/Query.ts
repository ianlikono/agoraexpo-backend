import * as _ from "lodash";
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
    t.list.field("filterProducts", {
      type: "Product",
      args: {
        searchString: stringArg()
      },
      resolve: (parent, { searchString }, ctx) => {
        return ctx.prisma.products({
          where: {
            OR: [
              { title_contains: searchString },
              { description_contains: searchString }
            ]
          },
          first: 10
        });
      }
    });

    t.list.field("similarProducts", {
      type: "Product",
      args: {
        brandName: stringArg({ required: false }),
        categories: stringArg({ required: false, list: true }),
        tags: stringArg({ required: false, list: true })
      },
      resolve: async (parent, { categories, brandName, tags }, ctx) => {
        let categoriesList = [];
        for (let i = 0; i < categories.length; i++) {
          categoriesList[i] = await ctx.prisma.products({
            where: { categories_some: { name_contains: categories[i] } }
          });
        }
        categoriesList = categoriesList.map(item => item[0]);
        categoriesList = _.uniqBy(categoriesList, "id");
        if (categoriesList.length > 5) {
          return categoriesList;
        } else {
          let tagsList = [];
          for (let i = 0; i < tags.length; i++) {
            tagsList[i] = await ctx.prisma.products({
              where: { tags_some: { name_contains: tags[i] } }
            });
          }
          tagsList = tagsList.map(item => item[0]);
          let similarList = [...categoriesList, ...tagsList];
          similarList = _.uniqBy(similarList, "id");
          if (similarList.length > 5) {
            return similarList;
          } else {
            const brandsList = await ctx.prisma.products({
              where: { brand: { name_contains: brandName } }
            });
            let finalSimilarList = [
              ...categoriesList,
              ...tagsList,
              ...brandsList
            ];
            finalSimilarList = _.uniqBy(finalSimilarList, "id");
            if (finalSimilarList.length > 5) {
              return finalSimilarList;
            } else {
              const toFetch = 5 - finalSimilarList.length;
              const finalSimilarIds = await finalSimilarList.map(item => {
                return item.id;
              });
              const remaining = await ctx.prisma.products({
                first: toFetch,
                where: { id_not_in: finalSimilarIds }
              });
              return [...finalSimilarList, ...remaining];
            }
          }
        }
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
        if (userId) {
          return ctx.prisma.carts({
            where: {
              user: {
                id: userId
              }
            }
          });
        } else {
          return null;
        }
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

    t.list.field("getShops", {
      type: "Shop",
      args: {
        limit: intArg({ required: false })
      },
      resolve: (parent, { limit }, ctx) => {
        return ctx.prisma.shops({
          first: limit
        });
      }
    });
    t.list.field("getUsers", {
      type: "User",
      args: {
        limit: intArg({ required: false })
      },
      resolve: (parent, { limit }, ctx) => {
        return ctx.prisma.users({
          first: limit
        });
      }
    });

    t.list.field("getForums", {
      type: "Forum",
      args: {
        limit: intArg({ required: false })
      },
      resolve: (parent, { limit }, ctx) => {
        return ctx.prisma.forums({
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
        shopId: idArg({ required: true }),
        limit: intArg({ required: false })
      },
      resolve: async (_, { shopId, limit }, ctx) => {
        const products = await ctx.prisma.products({
          where: { shop: { id: shopId } },
          first: limit
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
    t.list.field("getOrder", {
      type: "Order",
      args: {
        orderId: idArg({ required: true })
      },
      resolve: async (_, { orderId }, ctx) => {
        const order = await ctx.prisma.orders({
          where: { id: orderId }
        });
        return order;
      }
    });
    t.list.field("getMeOrders", {
      type: "Order",
      resolve: async (_, {}, ctx) => {
        const userId = getUserId(ctx);
        const orders = await ctx.prisma.orders({
          where: { user: { id: userId } }
        });
        return orders;
      }
    });
  }
});
