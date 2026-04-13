import { useState } from 'react';
import { Search, CalendarDays, Users, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { t, type Locale } from '@/lib/i18n';

interface SearchBarProps {
  onSearch: (params: { destination: string; checkIn: string; checkOut: string; guests: number }) => void;
  locale?: Locale;
}

const SearchBar = ({ onSearch, locale = 'en' }: SearchBarProps) => {
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ destination, checkIn, checkOut, guests });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg md:flex-row md:items-end md:gap-2 md:rounded-full md:p-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-muted px-3 py-2 md:rounded-full">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder', locale)}
            value={destination}
            onChange={e => setDestination(e.target.value)}
            className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 md:w-40 md:rounded-full">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            type="date"
            value={checkIn}
            onChange={e => setCheckIn(e.target.value)}
            className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 md:w-40 md:rounded-full">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            type="date"
            value={checkOut}
            onChange={e => setCheckOut(e.target.value)}
            className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 md:w-28 md:rounded-full">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            type="number"
            min={1}
            max={10}
            value={guests}
            onChange={e => setGuests(Number(e.target.value))}
            className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <Button type="submit" size="lg" className="gap-2 rounded-xl md:rounded-full">
          <Search className="h-4 w-4" />
          {t('searchButton', locale)}
        </Button>
      </div>
    </form>
  );
};

export default SearchBar;
