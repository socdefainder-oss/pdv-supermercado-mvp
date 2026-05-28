import { env } from './env.js';
import { app } from './app.js';

app.listen(env.PORT, () => {
  console.log(`PDV API rodando em http://localhost:${env.PORT}`);
});
