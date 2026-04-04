import app from "./app.js";

const port = process.env.PORT || 3000;

function startServer() {
  try {
    app.listen(port, function () {
      console.log(`App is running on port ${port}`);
    });
  } catch (error) {
    console.error(`Error in starting the App: ${error}`);
    process.exit(1);
  }
}

startServer();
