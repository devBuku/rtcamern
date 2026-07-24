const registerController = (req, res) => {
  res.send("Register endpoint");
};

const loginController = (req, res) => {
  res.send("Login endpoint");
};

const logoutController = (req, res) => {
  res.send("Logout endpoint");
};

export { registerController, loginController, logoutController };
