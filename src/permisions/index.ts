import { rule, shield } from 'graphql-shield';
import { getUserId } from '../utils/getUser';

const rules = {
	isAuthenticatedUser: rule()((parent, args, context) => {
		const userId = getUserId(context);
		return Boolean(userId);
	}),
	isShopOwner: rule()(async (parent, { id }, context) => {
		const userId = getUserId(context);
		const owner = await context.prisma.shop({ id }).owners();
		return userId === owner.id;
	})
};

export const permissions = shield({
	Query: {
		me: rules.isAuthenticatedUser
	},
	Mutation: {
		createShopDraft: rules.isAuthenticatedUser,
	}
});
