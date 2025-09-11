import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

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


async function searchLocation(city: string): Promise<string> {
  const url = `https://${RAPID_API_HOST}/v1/hotels/locations?locale=en-gb&name=${encodeURIComponent(
    city
  )}`;
  const res = await axios.get(url, { headers });
  if (!res.data || res.data.length === 0) {
    throw new Error(`No se encontró la ciudad: ${city}`);
  }
  return res.data[0].dest_id;
}

async function searchHotels(destId: string, checkin: string, checkout: string) {
  const url = `https://${RAPID_API_HOST}/v1/hotels/search?adults_number=2&page_number=0&children_number=2&include_adjacency=true&children_ages=5%2C0&locale=en-gb&dest_type=city&filter_by_currency=USD&dest_id=${destId}&order_by=popularity&units=metric&checkout_date=${checkout}&room_number=1&checkin_date=${checkin}`;
  const res = await axios.get(url, { headers });
  return res.data.result || [];
}

async function getFacilities(hotelId: string): Promise<string[]> {
  try {
    const url = `https://${RAPID_API_HOST}/v1/hotels/facilities?locale=en-gb&hotel_id=${hotelId}`;
    const res = await axios.get(url, { headers });
    return res.data.map((f: any) => f.facility_name);
  } catch {
    return [];
  }
}


export async function getHotelFacilities(
  input: FrancisInput
): Promise<HotelFacilitiesOutput[]> {
  const destId = await searchLocation(input.city);
  const hotels = await searchHotels(destId, input.start_date, input.end_date);

  if (!hotels || hotels.length === 0) {
    throw new Error(
      "No se encontraron hoteles para la ciudad y fechas especificadas."
    );
  }

  const foundHotel = findHotelByName(hotels, input.hotel);

  if (foundHotel) {
    const facilities = await getFacilities(foundHotel.hotel_id.toString());
    return [
      {
        hotel_name: foundHotel.hotel_name,
        facilities,
      },
    ];
  }

  const topHotels = hotels.slice(0, 1);
  const results: HotelFacilitiesOutput[] = [];

  for (const hotel of topHotels) {
    const facilities = await getFacilities(hotel.hotel_id.toString());
    results.push({
      hotel_name: hotel.hotel_name,
      facilities,
    });
  }

  return results;
}
