import { compare, hash } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { booleanArg, idArg, mutationType, stringArg } from 'nexus';
import * as shortid from 'shortid';
import { APP_SECRET, getUserId } from '../utils/getUser';


export const Mutation = mutationType({
    definition(t) {
        t.field('signUp', {
            type: 'AuthPayload',
            args: {
                name: stringArg({nullable: false}),
                email: stringArg({nullable: false}),
                password: stringArg({nullable: false}),
            },
            resolve: async (parent, {name, email, password}, ctx) => {
                const uniqueUsername = name.replace(/[^A-Z0-9]+/ig, "") + "-" + shortid.generate();
                const hashedPassword = await hash(password, 12);
                const user = await ctx.prisma.createUser({
                    name,
                    email,
                    password: hashedPassword,
                    username: uniqueUsername
                  })
                  return {
                    token: sign({ userId: user.id }, APP_SECRET),
                    user,
                  }
            }
        })

        t.field('updateUser', {
          type: 'User',
          args: {
            name: stringArg({nullable: true}),
            email: stringArg({nullable: true}),
            password: stringArg({nullable: true}),
            username: stringArg({nullable: true}),
            images: stringArg({list: true, required: false}),
          },
          resolve: async (_, { name, email, password, username, images }, ctx) => {
            const userId = getUserId(ctx)
            images.forEach(async (image) => {
                await ctx.prisma.createUserImage({
                imageUrl: image,
                user: { connect:  {id: userId}}
              })
            })
            return ctx.prisma.updateUser({
              where: { id: userId },
              data: {
                name: name,
                email: email,
                password: password,
                username: username,
              }
            })
          }
        })

        t.field('login', {
            type: 'AuthPayload',
            args: {
              email: stringArg({nullable: false}),
              password: stringArg({nullable: false}),
            },
            resolve: async (parent, { email, password }, context) => {
              const user = await context.prisma.user({ email })
              if (!user) {
                throw new Error(`No user found for email: ${email}`)
              }
              const passwordValid = await compare(password, user.password)
              if (!passwordValid) {
                throw new Error('Invalid password')
              }
              return {
                token: sign({ userId: user.id }, APP_SECRET),
                user,
              }
            },
          })
          t.field('createShopDraft', {
            type: 'Shop',
            args: {
              name: stringArg({required: true}),
              description: stringArg({required: true}),
              category: stringArg({required: true}),
              live: booleanArg(),
              ownersIds: idArg({list: true, required: false})
            },
            resolve: async (parent, { description, name, live, category, ownersIds }, ctx) => {
              const userId = getUserId(ctx)
                const ids = ownersIds.map((id) => {
                return {
                  id: id
                }
              })
              category = category.toLowerCase()
              const loggedInUser = [{id: userId}]
              const finalOwnerIds = ids.concat(loggedInUser);
              return ctx.prisma.createShop({
                name,
                description,
                live,
                category,
                owners: { connect:  finalOwnerIds},
              })
            },
          })
          t.field('publishShop', {
            type: 'Shop',
            args: { id: idArg() },
            resolve: async (_, { id }, ctx) => {
              return ctx.prisma.updateShop({
                where: { id },
                data: {live: true}
              })
            }
          })
          t.field('updateShop', {
            type: 'Shop',
            args: {
              id: idArg(),
              name: stringArg({nullable: true}),
              description: stringArg({nullable: true}),
              images: stringArg({list: true, required: false}),
            },
            resolve: async (_, { id,name, description, images }, ctx) => {
              images.forEach(async (image: any) => {
                  await ctx.prisma.createShopImage({
                  imageUrl: image,
                  shop: { connect:  {id: id}}
                })
              })
              return ctx.prisma.updateShop({
                where: { id: id },
                data: {
                  name: name,
                  description: description,
                }
              })
            }
          })

          t.field('createProduct', {
            type: 'Product',
            args: {
              id: idArg({required: true}),
              title: stringArg({required: true}),
              description: stringArg({required: true}),
              price: stringArg({required: true}),
              brand: stringArg({required: true}),
              tags: stringArg({list: true, required: false}),
              categories: stringArg({list: true, required: false}),
              images: stringArg({list: true, required: false}),
            },
            resolve: async (parent, { id,title, description, price, brand, tags, categories,  images}, ctx) => {
              let brandId = "null"
              brand = brand.toLowerCase()
              let brandItem = await ctx.prisma.brand({name: brand})
              if(!brandItem) {
                brandItem = await ctx.prisma.createBrand({
                  name: brand
                })
              }
              brandId = brandItem.id;
              let categoriesArray: any = [];
              let categoryIds: any = [];
              let tagsArray: any = [];
              let tagsIds: any = [];
              let imagesArray: any = [];
              let imagesIds: any = [];
                for (let category of categories) {
                category = category.toLowerCase()
                let categoryItem = await ctx.prisma.category({name: category})
                if(!categoryItem) {
                  categoryItem = await ctx.prisma.createCategory({
                    name: category
                  })
                }
                await categoriesArray.push(categoryItem);
                categoryIds = await categoriesArray.map((category: any) => ({id: category.id}));
                }

                for (let tag of tags) {
                  tag = tag.toLowerCase()
                  let tagItem = await ctx.prisma.tag({name: tag})
                  if(!tagItem) {
                    tagItem = await ctx.prisma.createTag({
                      name: tag
                    })
                  }
                  await tagsArray.push(tagItem);
                  tagsIds = await tagsArray.map((tag: any) => ({id: tag.id}));
                  }

                  for (let image of images) {
                      let imageItem = await ctx.prisma.createProductImage({
                        imageUrl: image
                      })
                    await imagesArray.push(imageItem);
                    imagesIds = await imagesArray.map((image: any) => ({id: image.id}));
                    }
              return ctx.prisma.createProduct({
                title,
                description,
                price,
                shop: { connect:  {id: id}},
                brand: { connect: {id: brandId}},
                categories: { connect: categoryIds},
                tags: { connect: tagsIds },
                images: { connect: imagesIds}
              })
            },
          })
    }
})