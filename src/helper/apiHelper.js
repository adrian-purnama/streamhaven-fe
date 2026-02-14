import axios from "axios";

const env = import.meta.env.VITE_NODE_ENV || import.meta.env.VITE_NODE_ENV_BUILD || "development";
const protocol = (env === "preprod" || env === "production") ? "https://" : "http://";
export const baseURL = protocol + import.meta.env.VITE_BACKEND_URL;

const axiosInstance = axios.create({
  baseURL,
  paramsSerializer: (params) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(`${key}[]`, item));
      } else if (value !== null && value !== undefined) {
        searchParams.append(key, value);
      }
    });
    return searchParams.toString();
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("fc-token");
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

export default axiosInstance;
