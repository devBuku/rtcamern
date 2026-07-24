import "dotenv/config";
import app from "./app.js";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App is listening on port: ${port} in ${process.env.NODE_ENV || "development"} environment`);
});
