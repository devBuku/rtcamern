import "dotenv/config"
import app from "./app.js";

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`App is listening on port: ${port}`);
});
