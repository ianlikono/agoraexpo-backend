import { prismaObjectType } from 'nexus-prisma';

export const Post = prismaObjectType({
  name: 'Shop',
  definition(t) {
    t.prismaFields(['*'])
  },
})