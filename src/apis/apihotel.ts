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

