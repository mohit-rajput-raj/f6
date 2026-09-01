import axios from "axios";

export const pypApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PYP_SERVER_URL || process.env.BACKEND_PYTHON_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export default pypApi;

