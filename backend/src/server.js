const dotenv = require("dotenv");
dotenv.config({ quiet: true });

const app = require("./app.js");

const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log(`App is listening to port ${port}`);
});
