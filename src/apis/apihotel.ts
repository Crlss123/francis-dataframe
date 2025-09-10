import axios from "axios";

const RAPID_API_KEY = process.env.RAPID_API_KEY || "";
const RAPID_API_HOST = process.env.RAPID_API_HOST || "";

const headers = {
  "x-rapidapi-key": RAPID_API_KEY,
  "x-rapidapi-host": RAPID_API_HOST,
};

export interface FrancisInput {
  city: string;
  start_date: string;
  end_date: string;
  category: string[];
  price: number;
  hotel: string;
}

export interface HotelFacilitiesOutput {
  hotel_name: string;
  facilities: string[];
}

function normalizeHotelName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function findHotelByName(hotels: any[], targetHotel: string): any | null {
  const normalizedTarget = normalizeHotelName(targetHotel);

  for (const hotel of hotels) {
    const normalizedHotelName = normalizeHotelName(hotel.hotel_name);
    if (normalizedHotelName === normalizedTarget) {
      return hotel;
    }
  }

  for (const hotel of hotels) {
    const normalizedHotelName = normalizeHotelName(hotel.hotel_name);
    if (normalizedHotelName.includes(normalizedTarget)) {
      return hotel;
    }
  }

  for (const hotel of hotels) {
    const normalizedHotelName = normalizeHotelName(hotel.hotel_name);
    if (
      normalizedTarget.includes(normalizedHotelName) &&
      normalizedHotelName.length > 3
    ) {
      return hotel;
    }
  }

  return null;
}
