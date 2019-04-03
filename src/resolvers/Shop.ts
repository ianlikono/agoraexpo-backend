import { prismaObjectType } from 'nexus-prisma';

export const Shop = prismaObjectType({
  name: 'Shop',
  definition(t) {
    t.prismaFields(['*'])
  },
})