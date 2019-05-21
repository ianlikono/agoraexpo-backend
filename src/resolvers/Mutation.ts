import * as admin from "firebase-admin";
import { booleanArg, idArg, intArg, mutationType, stringArg } from "nexus";
import * as shortid from "shortid";
import { userSessionIdPrefix } from "../constants/sessions";
import firebaseCredentials from "../credentials/firebase";
import { redis } from "../redis";
import { getUserId } from "../utils/getUser";

const firebase = admin.initializeApp(
  {
    //@ts-ignore
    credential: admin.credential.cert(firebaseCredentials),
    databaseURL: "https://agoraexpo-d0ae7.firebaseio.com" // TODO database URL goes here
  },
  "server"
);

export const Mutation = mutationType({
  definition(t) {
    t.field("signUp", {
      type: "AuthPayload",
      args: {
        name: stringArg({ nullable: true }),
        email: stringArg({ nullable: true }),
        profilePic: stringArg({ nullable: true }),
        isAnonymous: booleanArg({ nullable: false }),
        emailVerified: booleanArg({ nullable: true }),
        idToken: stringArg({ nullable: false })
      },
      resolve: async (
        parent,
        { name, email, profilePic, isAnonymous, emailVerified, idToken },
        ctx
      ) => {
        const decodedToken = await firebase.auth().verifyIdToken(idToken);
        if (decodedToken.sub) {
          let username = name.replace(/[^A-Z0-9]+/gi, "");
          const presentUser = await ctx.prisma.users({
            where: {
              username
            }
          });
          if (presentUser.length > 0) {
            username = username + "-" + shortid.generate();
          }
          const user = await ctx.prisma.createUser({
            name,
            email,
            profilePic,
            firebaseId: decodedToken.sub,
            isAnonymous,
            username: username.toLowerCase(),
            emailVerified
          });
          ctx.request.session.userId = user.id;
          if (ctx.request.sessionID) {
            await redis.lpush(
              `${userSessionIdPrefix}${user.id}`,
              ctx.request.sessionID
            );
          }
          return {
            user
          };
        }
      }
    });

    t.field("login", {
      type: "AuthPayload",
      args: {
        idToken: stringArg({ nullable: false })
      },
      resolve: async (parent, { idToken }, context) => {
        const decodedToken = await firebase.auth().verifyIdToken(idToken);
        if (decodedToken.sub) {
          const user = await context.prisma.user({
            firebaseId: decodedToken.sub
          });
          if (!user) {
            throw new Error(`Invalid Credentials`);
          }
          context.request.session.userId = user.id;
          if (context.request.sessionID) {
            await redis.lpush(
              `${userSessionIdPrefix}${user.id}`,
              context.request.sessionID
            );
          }
          return {
            user
          };
        }
      }
    });

    t.field("logout", {
      type: "AuthPayload",
      resolve: async (parent, args, context) => {
        return new Promise((res, rej) =>
          context.request.session.destroy((err: any) => {
            if (err) {
              console.log(err);
              return rej(false);
            }
            //@ts-ignore
            context.response.clearCookie("qid");
            res(true);
          })
        );
      }
    });

    t.field("updateUser", {
      type: "User",
      args: {
        name: stringArg({ nullable: true }),
        email: stringArg({ nullable: true }),
        password: stringArg({ nullable: true }),
        username: stringArg({ nullable: true }),
        images: stringArg({ list: true, required: false })
      },
      resolve: async (_, { name, email, password, username, images }, ctx) => {
        const userId = getUserId(ctx);
        images.forEach(async image => {
          await ctx.prisma.createUserImage({
            imageUrl: image,
            user: { connect: { id: userId } }
          });
        });
        return ctx.prisma.updateUser({
          where: { id: userId },
          data: {
            name: name,
            email: email,
            username: username
          }
        });
      }
    });

    t.field("createForum", {
      type: "Forum",
      args: {
        name: stringArg({ required: true }),
        description: stringArg({ required: false }),
        avatarPic: stringArg({ required: false }),
        coverPic: stringArg({ required: false })
      },
      resolve: async (
        parent,
        { description, name, avatarPic, coverPic },
        ctx
      ) => {
        const userId = getUserId(ctx);
        let forumName = name.replace(/[^A-Z0-9]+/gi, "");
        const presentForums = await ctx.prisma.forums({
          where: {
            name: forumName
          }
        });
        if (presentForums.length > 0) {
          forumName = forumName + "-" + shortid.generate();
        }
        return ctx.prisma.createForum({
          avatarPic: avatarPic,
          coverPic: coverPic,
          members: { connect: [{ id: userId }] },
          name: forumName,
          description: description
        });
      }
    });

    t.field("createForumPost", {
      type: "ForumPost",
      args: {
        title: stringArg({ required: true }),
        content: stringArg({ required: false }),
        type: stringArg({ required: true }),
        forumId: stringArg({ required: true })
      },
      resolve: async (parent, { title, content, type, forumId }, ctx) => {
        const userId = getUserId(ctx);
        return ctx.prisma.createForumPost({
          title,
          content,
          //@ts-ignore
          type,
          postedBy: { connect: { id: userId } },
          forum: { connect: { id: forumId } }
        });
      }
    });

    t.field("createPostForumComment", {
      type: "ForumPostComment",
      args: {
        postId: idArg({ required: true }),
        comment: stringArg({ required: true })
      },
      resolve: async (parent, { postId, comment }, ctx) => {
        const userId = getUserId(ctx);
        return ctx.prisma.createForumPostComment({
          comment,
          forumPost: { connect: { id: postId } },
          user: { connect: { id: userId } }
        });
      }
    });

    t.field("createShopDraft", {
      type: "Shop",
      args: {
        name: stringArg({ required: true }),
        description: stringArg({ required: true }),
        category: stringArg({ required: true }),
        live: booleanArg(),
        ownersIds: idArg({ list: true, required: false })
      },
      resolve: async (
        parent,
        { description, name, live, category, ownersIds },
        ctx
      ) => {
        const userId = getUserId(ctx);
        const ids = ownersIds.map(id => {
          return {
            id: id
          };
        });
        category = category.toLowerCase();
        const loggedInUser = [{ id: userId }];
        const finalOwnerIds = ids.concat(loggedInUser);
        return ctx.prisma.createShop({
          name,
          description,
          live,
          category,
          owners: { connect: finalOwnerIds }
        });
      }
    });
    t.field("publishShop", {
      type: "Shop",
      args: { id: idArg() },
      resolve: async (_, { id }, ctx) => {
        return ctx.prisma.updateShop({
          where: { id },
          data: { live: true }
        });
      }
    });
    t.field("updateShop", {
      type: "Shop",
      args: {
        id: idArg(),
        name: stringArg({ nullable: true }),
        description: stringArg({ nullable: true }),
        images: stringArg({ list: true, required: false })
      },
      resolve: async (_, { id, name, description, images }, ctx) => {
        images.forEach(async (image: any) => {
          await ctx.prisma.createShopImage({
            imageUrl: image,
            shop: { connect: { id: id } }
          });
        });
        return ctx.prisma.updateShop({
          where: { id: id },
          data: {
            name: name,
            description: description
          }
        });
      }
    });

    t.field("createProduct", {
      type: "Product",
      args: {
        id: idArg({ required: true }),
        title: stringArg({ required: true }),
        description: stringArg({ required: true }),
        price: stringArg({ required: true }),
        brand: stringArg({ required: true }),
        tags: stringArg({ list: true, required: false }),
        categories: stringArg({ list: true, required: false }),
        images: stringArg({ list: true, required: false })
      },
      resolve: async (
        parent,
        { id, title, description, price, brand, tags, categories, images },
        ctx
      ) => {
        let brandId = "null";
        brand = brand.toLowerCase();
        let brandItem = await ctx.prisma.brand({ name: brand });
        if (!brandItem) {
          brandItem = await ctx.prisma.createBrand({
            name: brand
          });
        }
        brandId = brandItem.id;
        let categoriesArray: any = [];
        let categoryIds: any = [];
        let tagsArray: any = [];
        let tagsIds: any = [];
        let imagesArray: any = [];
        let imagesIds: any = [];
        for (let category of categories) {
          category = category.toLowerCase();
          let categoryItem = await ctx.prisma.category({ name: category });
          if (!categoryItem) {
            categoryItem = await ctx.prisma.createCategory({
              name: category
            });
          }
          await categoriesArray.push(categoryItem);
          categoryIds = await categoriesArray.map((category: any) => ({
            id: category.id
          }));
        }

        for (let tag of tags) {
          tag = tag.toLowerCase();
          let tagItem = await ctx.prisma.tag({ name: tag });
          if (!tagItem) {
            tagItem = await ctx.prisma.createTag({
              name: tag
            });
          }
          await tagsArray.push(tagItem);
          tagsIds = await tagsArray.map((tag: any) => ({ id: tag.id }));
        }

        for (let image of images) {
          let imageItem = await ctx.prisma.createProductImage({
            imageUrl: image
          });
          await imagesArray.push(imageItem);
          imagesIds = await imagesArray.map((image: any) => ({ id: image.id }));
        }

        return ctx.prisma.createProduct({
          title,
          description,
          price,
          shop: { connect: { id: id } },
          brand: { connect: { id: brandId } },
          categories: { connect: categoryIds },
          tags: { connect: tagsIds },
          images: { connect: imagesIds }
        });
      }
    });

    t.field("addVariant", {
      type: "Variant",
      args: {
        productId: idArg({ required: true }),
        name: stringArg({ required: true }),
        values: stringArg({ list: true, required: false })
      },
      resolve: async (parent, { productId, name, values }, ctx) => {
        return ctx.prisma.createVariant({
          name,
          values: { set: values },
          product: { connect: { id: productId } }
        });
      }
    });

    t.field("updateVariant", {
      type: "Variant",
      args: {
        variantId: idArg({ required: true }),
        name: stringArg({ required: false }),
        values: stringArg({ list: true, required: false })
      },
      resolve: async (parent, { variantId, name, values }, ctx) => {
        return ctx.prisma.updateVariant({
          where: { id: variantId },
          data: {
            name,
            values: { set: values }
          }
        });
      }
    });

    t.field("createProductReview", {
      type: "ProductReview",
      args: {
        productId: idArg({ required: true }),
        rating: intArg({ required: true }),
        review: stringArg({ required: false })
      },
      resolve: async (parent, { productId, rating, review }, ctx) => {
        const userId = getUserId(ctx);
        return ctx.prisma.createProductReview({
          rating,
          review,
          product: { connect: { id: productId } },
          user: { connect: { id: userId } }
        });
      }
    });

    t.field("addItemToCart", {
      type: "Cart",
      args: {
        productId: idArg({ required: true }),
        quantity: intArg({ required: true }),
        variants: stringArg({ list: true })
      },
      resolve: async (parent, { productId, quantity, variants }, ctx) => {
        const userId = getUserId(ctx);
        let cartId = null;
        const availableCartItems = await ctx.prisma.carts({
          where: {
            user: {
              id: userId
            }
          }
        });
        if (availableCartItems.length <= 0) {
          return ctx.prisma.createCart({
            user: { connect: { id: userId } },
            items: {
              create: {
                quantity,
                product: { connect: { id: productId } },
                variants: { set: variants }
              }
            }
          });
        } else {
          cartId = availableCartItems[0].id;
          const availableQuantity = await ctx.prisma.cartItems({
            where: { product: { id: productId } }
          });

          if (availableQuantity.length <= 0) {
            return ctx.prisma.updateCart({
              data: {
                items: {
                  create: {
                    quantity,
                    product: { connect: { id: productId } },
                    variants: { set: variants }
                  }
                }
              },
              where: {
                id: cartId
              }
            });
          } else {
            return ctx.prisma.updateCart({
              data: {
                items: {
                  update: {
                    where: {
                      id: availableQuantity[0].id
                    },
                    data: {
                      quantity
                    }
                  }
                }
              },
              where: {
                id: cartId
              }
            });
          }
        }
      }
    });

    t.field("deleteCartItem", {
      type: "CartItem",
      args: {
        itemId: idArg({ required: true })
      },
      resolve: async (parent, { itemId }, ctx) => {
        const deletedItem = await ctx.prisma.deleteCartItem({
          id: itemId
        });
        return deletedItem;
      }
    });

    t.field("addShopCoverImage", {
      type: "ShopImage",
      args: {
        shopId: idArg({ required: true }),
        imageUrl: stringArg({ required: true }),
        largeImageUrl: stringArg({ required: true })
      },
      resolve: async (parent, { shopId, imageUrl, largeImageUrl }, ctx) => {
        const image = await ctx.prisma.createShopImage({
          imageUrl: imageUrl,
          largeImageUrl: largeImageUrl,
          shop: { connect: { id: shopId } }
        });
        return image;
      }
    });
    t.field("deleteShopCoverImage", {
      type: "ShopImage",
      args: {
        imageId: idArg({ required: true })
      },
      resolve: async (parent, { imageId }, ctx) => {
        const deletedmage = await ctx.prisma.deleteShopImage({
          id: imageId
        });
        return deletedmage;
      }
    });
    t.field("createOrder", {
      type: "Order",
      args: {
        items: idArg({ list: true, required: true }),
        paymentId: stringArg({ required: true }),
        PayerID: stringArg({ required: true }),
        cartId: idArg({ required: true })
      },
      resolve: async (parent, { items, paymentId, PayerID, cartId }, ctx) => {
        const userId = getUserId(ctx);
        let promises = [];
        for (let i = 0; i < items.length; ++i) {
          promises[i] = ctx.prisma.product({ id: items[i] });
        }
        const products = await Promise.all(promises);
        let productsList = [];
        let imgList = [];
        for (let i = 0; i < products.length; i++) {
          productsList[i] = ctx.prisma.cartItems({
            where: { product: { id: products[i].id } }
          });
          imgList[i] = ctx.prisma.productImages({
            where: { product: { id: products[i].id } }
          });
        }
        const cartItems = await Promise.all(productsList);
        const cartImages = await Promise.all(imgList);
        const createdOrderItems = [];
        let total = 0;
        for (let i = 0; i < products.length; i++) {
          createdOrderItems[i] = ctx.prisma.createorderItem({
            title: products[i].title,
            description: products[i].description,
            price: products[i].price,
            quantity: cartItems[i][0].quantity,
            variants: { set: cartItems[i][0].variants },
            imageUrl: cartImages[i][0].imageUrl
          });
          total = total + Number(products[i].price) * cartItems[i][0].quantity;
        }
        const orderItems = await Promise.all(createdOrderItems);
        const orderItemsIds = await orderItems.map((item: any) => ({
          id: item.id
        }));
        const createdOrder = await ctx.prisma.createOrder({
          user: { connect: { id: userId } },
          items: { connect: orderItemsIds },
          paymentId: paymentId,
          PayerID: PayerID,
          total: total.toString(),
          imageUrl: cartImages[0][0].imageUrl
        });
        const deletedCart = [];
        for (let i = 0; i < cartItems.length; i++) {
          deletedCart[i] = ctx.prisma.deleteCartItem({
            id: cartItems[i][0].id
          });
        }
        await Promise.all(deletedCart);
        await ctx.prisma.deleteCart({ id: cartId });
        return createdOrder;
      }
    });
  }
});
