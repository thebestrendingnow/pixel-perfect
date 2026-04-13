export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  description: string;
  stars: number;
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  currency: string;
  images: string[];
  amenities: string[];
  latitude: number;
  longitude: number;
  checkInTime: string;
  checkOutTime: string;
  hasParking: boolean;
  hasWifi: boolean;
  hasPetFriendly: boolean;
  hasPool: boolean;
  hasGym: boolean;
  hasRestaurant: boolean;
  hasLateCheckIn: boolean;
}

export interface PriceSource {
  provider: string;
  price: number;
  currency: string;
  url: string;
  isBestPrice: boolean;
}

export interface SearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  minPrice?: number;
  maxPrice?: number;
  minStars?: number;
  amenities?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
