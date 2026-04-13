import { useState, useEffect, useRef } from 'react';
import { Map, LayoutGrid, MapPin, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SearchBar from '@/components/SearchBar';
import HotelGrid from '@/components/HotelGrid';
import FilterSidebar from '@/components/FilterSidebar';
import MapView from '@/components/MapView';
import AIChatPanel from '@/components/AIChatPanel';
import { Button } from '@/components/ui/button';
import { api, type LocaleInfo } from '@/services/api';
import { detectLocale, t } from '@/lib/i18n';
import type { Hotel } from '@/types/hotel';

// Map ISO 2-letter country codes → readable country names used in data
const COUNTRY_CODE_MAP: Record<string, string> = {
  NL: 'Netherlands', DE: 'Germany', FR: 'France', ES: 'Spain',
  IT: 'Italy', GB: 'United Kingdom', US: 'United States', BE: 'Belgium',
  AT: 'Austria', PT: 'Portugal', CH: 'Switzerland', SE: 'Sweden',
  NO: 'Norway', DK: 'Denmark', PL: 'Poland', JP: 'Japan', CN: 'China',
  AU: 'Australia', CA: 'Canada', BR: 'Brazil', MX: 'Mexico',
};

const Index = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 400]);
  const [minStars, setMinStars] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [searchDestination, setSearchDestination] = useState('');
  const [localeInfo, setLocaleInfo] = useState<LocaleInfo | null>(null);
  const [detectedLocation, setDetectedLocation] = useState('');

  const locale = detectLocale();
  const initialLoadDone = useRef(false);

  // ── Step 1: detect IP locale on mount ─────────────────────────────────────
  useEffect(() => {
    api.getLocale().then((info) => {
      setLocaleInfo(info);
      const countryName = COUNTRY_CODE_MAP[info.country] || info.country;
      const label = info.city
        ? `${info.city}, ${countryName}`
        : countryName;
      setDetectedLocation(label);
    });
  }, []);

  // ── Step 2: load hotels once locale is known ───────────────────────────────
  useEffect(() => {
    if (!localeInfo) return;          // wait for locale
    if (initialLoadDone.current) return; // only once on first load
    initialLoadDone.current = true;
    loadInitialHotels(localeInfo);
  }, [localeInfo]);

  // ── Step 3: re-search when user changes filters / destination ─────────────
  useEffect(() => {
    if (!initialLoadDone.current) return; // don't double-fire on mount
    if (!searchDestination && !localeInfo) return;
    fetchHotels();
  }, [priceRange, minStars, selectedAmenities, searchDestination]);

  /**
   * Initial load: use IP country to show local hotels immediately.
   * Priority: by-country API → trending API → mock data.
   */
  const loadInitialHotels = async (info: LocaleInfo) => {
    setLoading(true);
    try {
      const countryName = COUNTRY_CODE_MAP[info.country] || info.country;
      const results = await api.getHotelsByCountry(info.country, countryName);
      if (results.length > 0) {
        setHotels(applyClientFilters(results));
        return;
      }
      // Fallback: trending (any country)
      const trending = await api.getTrendingHotels(info.country);
      setHotels(applyClientFilters(trending));
    } catch {
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  /** Apply price / star / amenity filters client-side */
  const applyClientFilters = (list: Hotel[]) => {
    return list.filter((h) => {
      if (h.pricePerNight < priceRange[0] || h.pricePerNight > priceRange[1]) return false;
      if (minStars && h.stars < minStars) return false;
      if (
        selectedAmenities.length &&
        !selectedAmenities.every((a) => h.amenities.includes(a))
      )
        return false;
      return true;
    });
  };

  /** Search triggered by user typing a destination or changing filters */
  const fetchHotels = async () => {
    setLoading(true);
    try {
      if (searchDestination) {
        const results = await api.searchHotels({
          destination: searchDestination,
          checkIn: '',
          checkOut: '',
          guests: 1,
          minPrice: priceRange[0],
          maxPrice: priceRange[1],
          minStars: minStars || undefined,
          amenities: selectedAmenities.length ? selectedAmenities : undefined,
        });
        setHotels(results);
      } else if (localeInfo) {
        // No destination typed — re-show country hotels with current filters
        const countryName = COUNTRY_CODE_MAP[localeInfo.country] || localeInfo.country;
        const results = await api.getHotelsByCountry(localeInfo.country, countryName);
        setHotels(applyClientFilters(results));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (params: {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  }) => {
    setSearchDestination(params.destination);
  };

  // Subtitle: show detected city/country
  const heroSubtitle = detectedLocation
    ? `${t('heroSubtitle', locale)} — ${t('showingNearby', locale) || 'Showing hotels near'} ${detectedLocation}`
    : t('heroSubtitle', locale);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onChatToggle={() => setChatOpen(!chatOpen)} chatOpen={chatOpen} locale={locale} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-card py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1
              className="text-3xl font-bold tracking-tight md:text-5xl"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              {t('heroTitle', locale)}{' '}
              <span className="text-primary">{t('heroHighlight', locale)}</span>
            </h1>
            {detectedLocation && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-primary/80">
                <MapPin className="h-4 w-4" />
                <span>
                  {t('showingNearby', locale) || 'Showing hotels near'}{' '}
                  <strong>{detectedLocation}</strong>
                </span>
              </div>
            )}
            <p className="mt-3 text-lg text-muted-foreground">
              {t('heroSubtitle', locale)}
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-4xl">
            <SearchBar onSearch={handleSearch} locale={locale} />
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('searching', locale)}
              </>
            ) : (
              `${hotels.length} ${t('hotelsFound', locale)}`
            )}
          </p>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="gap-1.5"
            >
              <LayoutGrid className="h-4 w-4" /> {t('gridView', locale)}
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="gap-1.5"
            >
              <Map className="h-4 w-4" /> {t('mapView', locale)}
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="hidden w-64 shrink-0 lg:block">
            <FilterSidebar
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              minStars={minStars}
              onStarsChange={setMinStars}
              selectedAmenities={selectedAmenities}
              onAmenitiesChange={setSelectedAmenities}
              locale={locale}
            />
          </div>
          <div className="flex-1">
            {viewMode === 'grid' ? (
              <HotelGrid hotels={hotels} loading={loading} locale={locale} />
            ) : (
              <MapView hotels={hotels} />
            )}
          </div>
        </div>
      </section>

      <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} locale={locale} />
    </div>
  );
};

export default Index;
