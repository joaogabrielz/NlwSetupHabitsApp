import Fastify from "fastify";
import cors from '@fastify/cors';
import { prisma } from './lib/prisma';
import { appRoutes } from "./routes";

const app = Fastify();

app.register(cors);
// app.register(cors, {
//   origin: ['http://localhost:3000']
// });
app.register(appRoutes);


app.listen({
  port: 3333,
  host: '0.0.0.0' // < pq Fastify nao permite acesso por ip por padrao, so localhost..
}).then(() => console.log(`HTTP server running at http://localhost:3333...`))
