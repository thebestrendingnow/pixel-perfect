import HotelCard from '@/components/HotelCard';
import { Skeleton } from '@/components/ui/skeleton';
import { t, type Locale } from '@/lib/i18n';
import type { Hotel } from '@/types/hotel';

interface HotelGridProps {
  hotels: Hotel[];
  loading: boolean;
  locale?: Locale;
}

const HotelGrid = ({ hotels, loading, locale = 'en' }: HotelGridProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>{t('noHotels', locale)}</p>
        <p className="mt-2 text-muted-foreground">{t('adjustSearch', locale)}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {hotels.map(hotel => (
        <HotelCard key={hotel.id} hotel={hotel} locale={locale} />
      ))}
    </div>
  );
};

export default HotelGrid;
