import axios from "axios";

const RAPID_API_KEY = process.env.RAPID_API_KEY || "";
const RAPID_API_HOST = process.env.RAPID_API_HOST || "";

const headers = {
  "x-rapidapi-key": RAPID_API_KEY,
  "x-rapidapi-host": RAPID_API_HOST,
};
