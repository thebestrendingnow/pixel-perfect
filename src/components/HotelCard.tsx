import { Link } from 'react-router-dom';
import { Star, MapPin, Car, Wifi, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { t, type Locale } from '@/lib/i18n';
import type { Hotel } from '@/types/hotel';

interface HotelCardProps {
  hotel: Hotel;
  locale?: Locale;
}

const HotelCard = ({ hotel, locale = 'en' }: HotelCardProps) => {
  return (
    <Link to={`/hotel/${hotel.id}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={hotel.images[0]}
            alt={hotel.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute right-3 top-3 flex gap-1.5">
            {hotel.hasParking && (
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                <Car className="mr-1 h-3 w-3" /> Parking
              </Badge>
            )}
            {hotel.hasLateCheckIn && (
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                <Clock className="mr-1 h-3 w-3" /> Late
              </Badge>
            )}
          </div>
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-primary text-primary-foreground text-lg font-bold px-3 py-1">
              ${hotel.pricePerNight}<span className="text-xs font-normal">{t('perNight', locale)}</span>
            </Badge>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="mb-1 flex items-center gap-1">
            {Array.from({ length: hotel.stars }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
            ))}
          </div>
          <h3 className="text-lg font-semibold leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            {hotel.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {hotel.city}, {hotel.country}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="rounded-md bg-primary px-2 py-0.5 text-sm font-bold text-primary-foreground">
                {hotel.rating}
              </span>
              <span className="text-xs text-muted-foreground">
                ({hotel.reviewCount} {t('reviews', locale)})
              </span>
            </div>
            <div className="flex gap-1">
              {hotel.hasWifi && <Wifi className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default HotelCard;
