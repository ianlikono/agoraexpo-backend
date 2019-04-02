import { compare, hash } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { booleanArg, mutationType, stringArg } from 'nexus';
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
            },
            resolve: async (parent, { description, name, live }, ctx) => {
              const userId = getUserId(ctx)
              return ctx.prisma.createShop({
                name,
                description,
                live,
                owners: { connect: [{ id: userId }] },
              })
            },
          })
    }
})