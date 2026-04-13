import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Clock, Car, Wifi, Dog, Dumbbell, UtensilsCrossed, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PriceComparisonTable from '@/components/PriceComparisonTable';
import { api } from '@/services/api';
import { detectLocale, t } from '@/lib/i18n';
import type { Hotel, PriceSource } from '@/types/hotel';
import { Skeleton } from '@/components/ui/skeleton';

const amenityIcons: Record<string, React.ReactNode> = {
  'Free WiFi': <Wifi className="h-4 w-4" />,
  Parking: <Car className="h-4 w-4" />,
  'Free Parking': <Car className="h-4 w-4" />,
  'Valet Parking': <Car className="h-4 w-4" />,
  Pool: <Waves className="h-4 w-4" />,
  Gym: <Dumbbell className="h-4 w-4" />,
  Restaurant: <UtensilsCrossed className="h-4 w-4" />,
  'Pet Friendly': <Dog className="h-4 w-4" />,
  'Late Check-in': <Clock className="h-4 w-4" />,
};

const HotelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [prices, setPrices] = useState<PriceSource[]>([]);
  const [loadingHotel, setLoadingHotel] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const locale = detectLocale();

  useEffect(() => {
    if (!id) return;
    setLoadingHotel(true);
    setLoadingPrices(true);

    api.getHotel(id).then(h => {
      setHotel(h ?? null);
      setLoadingHotel(false);
    });

    api.comparePrices(id).then(p => {
      setPrices(p);
      setLoadingPrices(false);
    });
  }, [id]);

  if (loadingHotel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-xl font-semibold">{t('noHotels', locale)}</p>
        <Link to="/" className="mt-4 text-primary underline">{t('backToResults', locale)}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <Link to="/">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> {t('backToResults', locale)}
          </Button>
        </Link>

        {/* Gallery */}
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-xl">
            <img
              src={hotel.images[selectedImage]}
              alt={hotel.name}
              className="h-[400px] w-full object-cover"
            />
          </div>
          <div className="flex gap-3 md:flex-col">
            {hotel.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`overflow-hidden rounded-lg border-2 transition-colors ${
                  i === selectedImage ? 'border-primary' : 'border-transparent'
                }`}
              >
                <img src={img} alt="" className="h-28 w-full object-cover md:h-[120px]" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex items-center gap-2">
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <h1 className="mt-2 text-3xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
              {hotel.name}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {hotel.address}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <span className="rounded-lg bg-primary px-3 py-1 text-lg font-bold text-primary-foreground">
                {hotel.rating}
              </span>
              <span className="text-sm text-muted-foreground">{hotel.reviewCount} {t('reviews', locale)}</span>
            </div>

            <p className="mt-6 leading-relaxed text-foreground">{hotel.description}</p>

            <h2 className="mt-8 text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
              {t('amenities', locale)}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {hotel.amenities.map(amenity => (
                <Badge key={amenity} variant="secondary" className="gap-1.5 px-3 py-1.5">
                  {amenityIcons[amenity] || null}
                  {amenity}
                </Badge>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('checkIn', locale)}</p>
                <p className="font-semibold">{hotel.checkInTime}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('checkOut', locale)}</p>
                <p className="font-semibold">{hotel.checkOutTime}</p>
              </div>
            </div>

            <div className="mt-8">
              <PriceComparisonTable prices={prices} loading={loadingPrices} locale={locale} />
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('from', locale)}</p>
                <p className="text-4xl font-bold text-primary" style={{ fontFamily: 'Sora, sans-serif' }}>
                  ${hotel.pricePerNight}
                </p>
                <p className="text-sm text-muted-foreground">{t('perNight', locale)}</p>
              </div>
              <Button className="mt-6 w-full" size="lg">
                {t('bookNow', locale)}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {t('freeCancellation', locale)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetail;
