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
  address: h.location || h.address || '',
  description: h.description || `${h.name} in ${h.city || h.location}`,
  stars: h.stars || 3,
  rating: h.rating || 7.5,
  reviewCount: h.review_count || h.reviewCount || 0,
  pricePerNight: h.price || h.pricePerNight || 89,
  currency: h.currency || 'EUR',
  images: h.image_url
    ? [h.image_url]
    : h.images?.length
    ? h.images
    : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
  amenities: (() => {
    try {
      return typeof h.amenities === 'string'
        ? JSON.parse(h.amenities)
        : h.amenities || [];
    } catch {
      return [];
    }
  })(),
  latitude: h.latitude || 0,
  longitude: h.longitude || 0,
  checkInTime: h.checkInTime || '15:00',
  checkOutTime: h.checkOutTime || '11:00',
  hasParking: !!h.has_parking || !!h.hasParking,
  hasWifi: true,
  hasPetFriendly: !!h.is_pet_friendly || !!h.hasPetFriendly,
  hasPool: !!h.hasPool,
  hasGym: !!h.hasGym,
  hasRestaurant: !!h.has_breakfast || !!h.hasRestaurant,
  hasLateCheckIn: !!h.hasLateCheckIn || true,
});

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Locale / IP detection ─────────────────────────────────────────────────

export interface LocaleInfo {
  country: string;       // e.g. "NL"
  city: string;
  region: string;
  language: string;      // e.g. "nl"
  currency: string;      // e.g. "EUR"
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  rtl: boolean;
  high_driver_market: boolean;
}

let _localeCache: LocaleInfo | null = null;

export const getLocale = async (): Promise<LocaleInfo> => {
  if (_localeCache) return _localeCache;
  try {
    const data = await apiFetch('/locale');
    _localeCache = data as LocaleInfo;
    return _localeCache;
  } catch {
    // Fallback — try browser navigator
    const lang = navigator.language?.split('-')[0] || 'en';
    return {
      country: 'US',
      city: '',
      region: '',
      language: lang,
      currency: 'USD',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      latitude: null,
      longitude: null,
      rtl: false,
      high_driver_market: false,
    };
  }
};

// ─── Main API surface ──────────────────────────────────────────────────────

export const api = {
  /** Get user's locale from the backend (IP-based via Cloudflare headers) */
  getLocale,

  /**
   * Search hotels — calls backend which checks D1 cache then Travelpayouts.
   * Falls back to mock data filtered by detected country when backend is empty.
   */
  searchHotels: async (params: SearchParams): Promise<Hotel[]> => {
    try {
      const data = await apiFetch('/search', {
        method: 'POST',
        body: JSON.stringify({
          location: params.destination || '',
          check_in: params.checkIn,
          check_out: params.checkOut,
          guests: params.guests || 1,
          max_price: params.maxPrice,
          stars: params.minStars,
          currency: 'EUR',
        }),
      });
      if (data.hotels?.length) return data.hotels.map(mapHotel);
    } catch (_e) {
      // ignore — fall through to mock
    }

    // Fallback to mock
    await delay(300);
    let results = [...mockHotels];
    if (params.destination) {
      const q = params.destination.toLowerCase();
      results = results.filter(
        (h) =>
          h.city.toLowerCase().includes(q) ||
          h.country.toLowerCase().includes(q) ||
          h.name.toLowerCase().includes(q)
      );
    }
    if (params.minPrice !== undefined)
      results = results.filter((h) => h.pricePerNight >= params.minPrice!);
    if (params.maxPrice !== undefined)
      results = results.filter((h) => h.pricePerNight <= params.maxPrice!);
    if (params.minStars !== undefined)
      results = results.filter((h) => h.stars >= params.minStars!);
    if (params.amenities?.length) {
      results = results.filter((h) =>
        params.amenities!.every((a) => h.amenities.includes(a))
      );
    }
    return results;
  },

  /**
   * Fetch hotels by country code.
   * First tries the backend /api/hotels/by-country endpoint,
   * then falls back to filtering mockHotels.
   */
  getHotelsByCountry: async (
    countryCode: string,
    countryName?: string
  ): Promise<Hotel[]> => {
    try {
      const data = await apiFetch(
        `/hotels/by-country?country=${encodeURIComponent(countryCode)}&limit=20`
      );
      if (data.hotels?.length) return data.hotels.map(mapHotel);
    } catch (_e) {
      // fall through
    }

    // Fallback — filter mock by country name
    const needle = (countryName || countryCode).toLowerCase();
    return mockHotels.filter(
      (h) =>
        h.country.toLowerCase().includes(needle) ||
        h.country.toLowerCase() === countryCode.toLowerCase()
    );
  },

  /**
   * Fetch trending / default hotels.
   * Tries /api/hotels/trending first, then mock.
   */
  getTrendingHotels: async (countryCode?: string): Promise<Hotel[]> => {
    try {
      const qs = countryCode ? `?country=${countryCode}&limit=20` : '?limit=20';
      const data = await apiFetch(`/hotels/trending${qs}`);
      if (data.hotels?.length) return data.hotels.map(mapHotel);
    } catch (_e) {
      // fall through
    }
    return mockHotels;
  },

  getHotel: async (id: string): Promise<Hotel | undefined> => {
    try {
      const data = await apiFetch(`/search/hotel/${id}`);
      if (data) return mapHotel(data);
    } catch {}
    await delay(200);
    return mockHotels.find((h) => h.id === id);
  },

  comparePrices: async (hotelId: string): Promise<PriceSource[]> => {
    try {
      const data = await apiFetch('/prices/compare', {
        method: 'POST',
        body: JSON.stringify({ hotel_id: hotelId, guests: 2, currency: 'EUR' }),
      });
      if (data.prices?.length) {
        return data.prices.map((p: any) => ({
          provider: p.provider,
          price: p.price,
          currency: p.currency || 'EUR',
          url: p.book_url || '#',
          isBestPrice: p.is_best_price,
        }));
      }
    } catch {}
    await delay(1200);
    const hotel = mockHotels.find((h) => h.id === hotelId);
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
  streamChat: async (
    message: string,
    onToken: (t: string) => void,
    onHotels: (h: any[]) => void
  ) => {
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
