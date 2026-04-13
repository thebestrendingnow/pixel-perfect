import { Link } from 'react-router-dom';
import { MessageCircle, Hotel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, type Locale } from '@/lib/i18n';

interface NavbarProps {
  onChatToggle: () => void;
  chatOpen: boolean;
  locale?: Locale;
}

const Navbar = ({ onChatToggle, chatOpen, locale = 'en' }: NavbarProps) => {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Hotel className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Travel AI <span className="text-primary">PFR</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant={chatOpen ? 'default' : 'outline'}
            size="sm"
            onClick={onChatToggle}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t('aiFinder', locale)}</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
