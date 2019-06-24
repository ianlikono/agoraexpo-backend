FROM node:10

# Create app directory
WORKDIR /usr/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

# Bundle app source
COPY . .

ENV NODE_ENV=production
EXPOSE 4000
CMD npm run dev
USER node

# for typescript
# RUN npm run build
# ENV NODE_ENV=production
# COPY .env ./dist/
# COPY prisma.yml ./dist/
# COPY src/credentials ./dist/
# COPY src/generated/schema.graphql ./dist/src/generated/
# COPY src/types.ts ./dist/src/
# WORKDIR ./dist

# EXPOSE 4000
# CMD node src/index.js
# USER node
