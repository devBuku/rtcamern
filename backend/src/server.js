import "dotenv/config";
import app from "./app.js";
import { NODE_ENV, PORT } from "./constants/env.js";

app.listen(PORT, () => {
  console.log(`App is listening on port: ${PORT} in ${NODE_ENV} environment`);
});
