import { mockHotels, mockPriceComparison } from '@/data/mockHotels';
import type { Hotel, PriceSource, SearchParams } from '@/types/hotel';

// Use real backend API — falls back to mock if API fails
const API_BASE = '/api';

const getToken = () => localStorage.getItem('travel_token') || '';

const apiFetch = async (path: string, opts: RequestInit = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
};

// Map backend hotel_cache shape → frontend Hotel shape
const mapHotel = (h: any): Hotel => ({
  id: h.id || h.travelpayouts_id || String(h.travelpayouts_id),
  name: h.name,
  city: h.city || h.location || '',
  country: h.country || '',
  address: h.location || '',
  description: h.description || `${h.name} in ${h.city || h.location}`,
  stars: h.stars || 3,
  rating: h.rating || 7.5,
  reviewCount: h.review_count || 0,
  pricePerNight: h.price || 89,
  currency: h.currency || 'USD',
  images: h.image_url ? [h.image_url] : [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
  ],
  amenities: (() => {
    try { return typeof h.amenities === 'string' ? JSON.parse(h.amenities) : (h.amenities || []); }
    catch { return []; }
  })(),
  latitude: h.latitude || 0,
  longitude: h.longitude || 0,
  checkInTime: '15:00',
  checkOutTime: '11:00',
  hasParking: !!h.has_parking,
  hasWifi: true,
  hasPetFriendly: !!h.is_pet_friendly,
  hasPool: false,
  hasGym: false,
  hasRestaurant: !!h.has_breakfast,
  hasLateCheckIn: true,
});

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export const api = {
  searchHotels: async (params: SearchParams): Promise<Hotel[]> => {
    try {
      const data = await apiFetch('/search', {
        method: 'POST',
        body: JSON.stringify({
          location: params.destination || 'New York',
          check_in: params.checkIn,
          check_out: params.checkOut,
          guests: params.guests || 1,
          max_price: params.maxPrice,
          stars: params.minStars,
          currency: 'USD',
        }),
      });
      if (data.hotels?.length) return data.hotels.map(mapHotel);
    } catch {}
    // fallback to mock
    await delay(400);
    let results = [...mockHotels];
    if (params.destination) {
      const q = params.destination.toLowerCase();
      results = results.filter(h =>
        h.city.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q)
      );
    }
    if (params.minPrice !== undefined) results = results.filter(h => h.pricePerNight >= params.minPrice!);
    if (params.maxPrice !== undefined) results = results.filter(h => h.pricePerNight <= params.maxPrice!);
    if (params.minStars !== undefined) results = results.filter(h => h.stars >= params.minStars!);
    if (params.amenities?.length) {
      results = results.filter(h => params.amenities!.every(a => h.amenities.includes(a)));
    }
    return results;
  },

  getHotel: async (id: string): Promise<Hotel | undefined> => {
    try {
      const data = await apiFetch(`/search/hotel/${id}`);
      if (data) return mapHotel(data);
    } catch {}
    await delay(200);
    return mockHotels.find(h => h.id === id);
  },

  comparePrices: async (hotelId: string): Promise<PriceSource[]> => {
    try {
      const data = await apiFetch('/prices/compare', {
        method: 'POST',
        body: JSON.stringify({ hotel_id: hotelId, guests: 2, currency: 'USD' }),
      });
      if (data.prices?.length) {
        return data.prices.map((p: any) => ({
          provider: p.provider,
          price: p.price,
          currency: p.currency || 'USD',
          url: p.book_url || '#',
          isBestPrice: p.is_best_price,
        }));
      }
    } catch {}
    await delay(1200);
    const hotel = mockHotels.find(h => h.id === hotelId);
    if (!hotel) return [];
    return mockPriceComparison(hotel.pricePerNight);
  },

  getAllHotels: async (): Promise<Hotel[]> => {
    try {
      const data = await apiFetch('/hotels/trending?limit=20');
      if (data.hotels?.length) return data.hotels.map(mapHotel);
    } catch {}
    await delay(200);
    return mockHotels;
  },

  // Auth helpers
  login: async (email: string, password: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) localStorage.setItem('travel_token', data.token);
    return data;
  },

  register: async (email: string, password: string, name: string) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    if (data.token) localStorage.setItem('travel_token', data.token);
    return data;
  },

  getMe: async () => {
    return apiFetch('/auth/me');
  },

  logout: () => {
    localStorage.removeItem('travel_token');
  },

  // AI chat — SSE stream
  streamChat: async (message: string, onToken: (t: string) => void, onHotels: (h: any[]) => void) => {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, language: 'en' }),
      });
      if (!res.ok || !res.body) throw new Error('SSE failed');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'token') onToken(ev.token);
            if (ev.type === 'hotels') onHotels(ev.hotels || []);
          } catch {}
        }
      }
      return true;
    } catch {
      return false;
    }
  },
};
