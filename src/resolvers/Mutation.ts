import { compare, hash } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { booleanArg, idArg, mutationType, stringArg } from 'nexus';
import * as uuidv4 from 'uuid/v4';
import { APP_SECRET, getUserId } from '../utils/getUser';


export const Mutation = mutationType({
    definition(t) {
        t.field('signUp', {
            type: 'AuthPayload',
            args: {
                name: stringArg(),
                email: stringArg(),
                password: stringArg(),
            },
            resolve: async (parent, {name, email, password}, ctx) => {
                const uniqueUsername = name.replace(/[^A-Z0-9]+/ig, "") + "-" + uuidv4();
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
              email: stringArg(),
              password: stringArg(),
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
              name: stringArg(),
              description: stringArg(),
              live: booleanArg(),
              ownersIds: idArg({list: true, required: false})
            },
            resolve: async (parent, { description, name, live, ownersIds }, ctx) => {
              const userId = getUserId(ctx)
                const ids = ownersIds.map((id) => {
                return {
                  id: id
                }
              })
              const loggedInUser = [{id: userId}]
              const finalOwnerIds = ids.concat(loggedInUser);
              return ctx.prisma.createShop({
                name,
                description,
                live,
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
    }
})