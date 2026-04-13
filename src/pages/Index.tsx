import { useState, useEffect, createContext, useContext } from 'react';
import { Map, LayoutGrid } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SearchBar from '@/components/SearchBar';
import HotelGrid from '@/components/HotelGrid';
import FilterSidebar from '@/components/FilterSidebar';
import MapView from '@/components/MapView';
import AIChatPanel from '@/components/AIChatPanel';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { detectLocale, t } from '@/lib/i18n';
import type { Hotel } from '@/types/hotel';

const Index = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 300]);
  const [minStars, setMinStars] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [searchDestination, setSearchDestination] = useState('');
  const locale = detectLocale();

  const fetchHotels = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => {
    fetchHotels();
  }, [priceRange, minStars, selectedAmenities, searchDestination]);

  const handleSearch = (params: { destination: string; checkIn: string; checkOut: string; guests: number }) => {
    setSearchDestination(params.destination);
  };

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
          <p className="text-sm text-muted-foreground">
            {loading ? t('searching', locale) : `${hotels.length} ${t('hotelsFound', locale)}`}
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
