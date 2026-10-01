import axios from "axios";

// On client-side (in browser), route requests via Next.js API proxy `/api/pyp` by default.
// This prevents CORS, Mixed-Content, and ERR_CONNECTION_REFUSED when localhost:8000 is not accessible
// on remote or non-host user machines.
// On server-side (Node.js Server Actions / SSR), directly call the Python FastAPI server.
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_PYP_SERVER_URL || "/api/pyp";
  }
  return (
    process.env.BACKEND_PYTHON_URL ||
    process.env.PYP_SERVER_URL ||
    "http://localhost:8000"
  );
};

export const pypApi = axios.create({
  baseURL: getBaseURL(),
  timeout: 120000, // 2-minute timeout for AI & LLM operations
  headers: {
    "Content-Type": "application/json",
  },
});

// Guard: Ensure browser calls never accidentally hit hardcoded localhost:8000
pypApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    if (
      !config.baseURL ||
      config.baseURL.includes("localhost:8000") ||
      config.baseURL === ""
    ) {
      config.baseURL = process.env.NEXT_PUBLIC_PYP_SERVER_URL || "/api/pyp";
    }
  }
  return config;
});

export default pypApi;


