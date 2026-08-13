import path from "path";

// In production the app folder gets replaced on every redeploy, so the
// database and uploads are kept in a sibling folder that survives that.
export const DATA_DIR =
  process.env.NODE_ENV === "production"
    ? path.join(process.cwd(), "..", "inci-db")
    : path.join(process.cwd(), "data");
