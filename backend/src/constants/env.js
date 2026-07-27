const getKey = (key, defaultValue) => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const PORT = getKey("PORT", 3000);
export const NODE_ENV = getKey("NODE_ENV", "development");
export const MONGO_URI = getKey("MONGO_URI");
