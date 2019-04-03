import { rule, shield } from 'graphql-shield';
import { getUserId } from '../utils/getUser';

interface Owner {
	name: String
	email: String
	username: String
	id: String
	password: String
}

const rules = {
	isAuthenticatedUser: rule()((parent, args, context) => {
		const userId = getUserId(context);
		return Boolean(userId);
	}),
	isShopOwner: rule()(async (parent, { id }, context) => {
		const userId = getUserId(context);
		const owners = await context.prisma.shop({ id }).owners();
		if (owners.some((e: Owner) => e.id == userId)) {
			return true
		  } else {
			  return false
		  }

	})
};

export const permissions = shield({
	Query: {
		me: rules.isAuthenticatedUser
	},
	Mutation: {
		createShopDraft: rules.isAuthenticatedUser,
		publishShop: rules.isShopOwner,
		updateShop: rules.isShopOwner,
	}
});
