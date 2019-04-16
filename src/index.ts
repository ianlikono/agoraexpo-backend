import { GraphQLServer } from "graphql-yoga";
import { makePrismaSchema } from "nexus-prisma";
import * as path from "path";
import * as session from "express-session";
import * as connectRedis from "connect-redis";
import datamodelInfo from "../generated/nexus-prisma";
import { prisma } from "../generated/prisma-client";
import { permissions } from "./permisions";
import * as allTypes from "./resolvers";
import { redis } from "./redis";
import { redisSessionPrefix } from "./constants/sessions";
require("dotenv").config();

const SESSION_SECRET = process.env.SESSION_SECRET;
const RedisStore = connectRedis(session);

const schema = makePrismaSchema({
  // Provide all the GraphQL types we've implemented
  types: allTypes,

  // Configure the interface to Prisma
  prisma: {
    datamodelInfo,
    client: prisma
  },

  // Specify where Nexus should put the generated files
  outputs: {
    schema: path.join(__dirname, "./generated/schema.graphql"),
    typegen: path.join(__dirname, "./generated/nexus.ts")
  },

  // Configure nullability of input arguments: All arguments are non-nullable by default
  nonNullDefaults: {
    input: false,
    output: false
  },

  // Configure automatic type resolution for the TS representations of the associated types
  typegenAutoConfig: {
    sources: [
      {
        source: path.join(__dirname, "./types.ts"),
        alias: "types"
      }
    ],
    contextType: "types.Context"
  }
});

const server = new GraphQLServer({
  schema,
  middlewares: [permissions],
  context: request => {
    return {
      ...request,
      prisma,
      redis
    };
  }
});

const opts = {
  port: 4000,
  cors: {
    credentials: true,
    origin: ["http://localhost:3000"] // your frontend url.
  }
};

server.express.use(
  session({
    store: new RedisStore({
      client: redis as any,
      prefix: redisSessionPrefix
    }),
    name: "qid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7 * 365 // 7 years
    }
  } as any)
);

server.start(opts, () =>
  console.log(`🚀 Server is running on http://localhost:${opts.port}`)
);
