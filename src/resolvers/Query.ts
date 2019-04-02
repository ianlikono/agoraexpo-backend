import { queryType } from 'nexus';
import { getUserId } from '../utils/getUser';

export const Query = queryType({
    definition(t){
        t.field('me', {
            type: 'User',
            resolve: (parent, args, ctx) => {
                const userId = getUserId(ctx)
                return ctx.prisma.user({ id: userId })
              },
        })
    }
})