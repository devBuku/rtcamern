function getEnv(key: string, defaultValue?: string) {
  const value = process.env[key] ?? defaultValue;

  if (value === undefined) throw new Error(`${key} is not found!!`);

  return value;
}

const validEnvs = ["development", "production", "test"] as const;
type NodeEnv = (typeof validEnvs)[number];

const rawNodeEnv = process.env.NODE_ENV ?? "development";
export const NODE_ENV = (
  validEnvs.includes(rawNodeEnv as NodeEnv)
    ? (rawNodeEnv as NodeEnv)
    : "development"
) as NodeEnv;

export const PORT = getEnv("PORT", "3000");

function getMongoUri(): string {
  if (NODE_ENV === "production") {
    return getEnv("MONGO_URI");
  }

  // In development/test, prefer MONGO_URI_DOCKER, fallback to MONGO_URI
  const dockerUri = process.env.MONGO_URI_DOCKER;
  if (dockerUri !== undefined && dockerUri.trim() !== "") {
    return dockerUri.trim();
  }

  const fallbackUri = process.env.MONGO_URI;
  if (fallbackUri !== undefined && fallbackUri.trim() !== "") {
    return fallbackUri.trim();
  }

  throw new Error(
    "MongoDB connection URI missing: set MONGO_URI_DOCKER for local Docker development, or MONGO_URI as a fallback.",
  );
}

export const MONGO_URI = getMongoUri();

export const DB_NAME = getEnv("DB_NAME", "rtcamern");

export const FRONTEND_URL = getEnv("FRONTEND_URL", "http://localhost:5173");
export const CLERK_WEBHOOK_SIGNING_SECRET =
  process.env.CLERK_WEBHOOK_SIGNING_SECRET;
