import axios from 'axios';
import { FrancisInput } from '..';
import dotenv from "dotenv";
dotenv.config();


const BASE_URL = process.env.SERVICE_URL;

interface InputData extends FrancisInput {
  request_id: number;
}

export async function getBookingInfo(input: InputData) {
  try {
    const response = await axios.post(`${BASE_URL}/booking`, input, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching booking info:', error);
    throw error;
  }
}

export async function getScraperInfo(input: InputData){
  try{
    const response = await axios.post(`${BASE_URL}/scraping`, input, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }catch(error){
    throw error;
  }
}
