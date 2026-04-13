import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { t, type Locale } from '@/lib/i18n';

interface FilterSidebarProps {
  priceRange: [number, number];
  onPriceChange: (val: [number, number]) => void;
  minStars: number;
  onStarsChange: (val: number) => void;
  selectedAmenities: string[];
  onAmenitiesChange: (val: string[]) => void;
  locale?: Locale;
}

const FilterSidebar = ({
  priceRange,
  onPriceChange,
  minStars,
  onStarsChange,
  selectedAmenities,
  onAmenitiesChange,
  locale = 'en',
}: FilterSidebarProps) => {
  const topAmenities = ['Free Parking', 'Late Check-in', 'Pet Friendly', 'Pool', 'Breakfast', 'Free WiFi', 'Gym', 'Restaurant'];

  const toggleAmenity = (amenity: string) => {
    onAmenitiesChange(
      selectedAmenities.includes(amenity)
        ? selectedAmenities.filter(a => a !== amenity)
        : [...selectedAmenities, amenity]
    );
  };

  return (
    <aside className="space-y-6 rounded-xl border border-border bg-card p-5">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Sora, sans-serif' }}>
          {t('priceRange', locale)}
        </h3>
        <div className="px-1">
          <Slider
            min={0}
            max={300}
            step={5}
            value={[priceRange[0], priceRange[1]]}
            onValueChange={(v) => onPriceChange([v[0], v[1]])}
          />
          <div className="mt-2 flex justify-between text-sm text-muted-foreground">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Sora, sans-serif' }}>
          {t('starRating', locale)}
        </h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => onStarsChange(minStars === s ? 0 : s)}
              className={`flex items-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
                minStars >= s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {s}
              <Star className="h-3 w-3 fill-current" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'Sora, sans-serif' }}>
          {t('amenities', locale)}
        </h3>
        <div className="space-y-2.5">
          {topAmenities.map(amenity => (
            <div key={amenity} className="flex items-center gap-2">
              <Checkbox
                id={amenity}
                checked={selectedAmenities.includes(amenity)}
                onCheckedChange={() => toggleAmenity(amenity)}
              />
              <Label htmlFor={amenity} className="cursor-pointer text-sm">
                {amenity}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
