import { app } from '../src/index';

export default async function handler(req: Request) {
  return app.fetch(req);
}
