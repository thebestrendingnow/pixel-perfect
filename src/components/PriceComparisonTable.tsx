import { ExternalLink, TrendingDown, CheckCircle } from 'lucide-react';
import { t, type Locale } from '@/lib/i18n';
import type { PriceSource } from '@/types/hotel';
import { Skeleton } from '@/components/ui/skeleton';

interface PriceComparisonTableProps {
  prices: PriceSource[];
  loading: boolean;
  locale?: Locale;
}

const PriceComparisonTable = ({ prices, loading, locale = 'en' }: PriceComparisonTableProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
            {t('priceComparison', locale)}...
          </h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...prices].sort((a, b) => a.price - b.price);
  const bestPrice = sorted[0]?.price ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
          {t('priceComparison', locale)}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Provider</th>
              <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Price</th>
              <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Difference</th>
              <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((source, i) => (
              <tr
                key={source.provider}
                className={`border-b border-border transition-colors ${
                  i === 0 ? 'bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{source.provider}</span>
                    {i === 0 && <CheckCircle className="h-4 w-4 text-primary" />}
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-lg font-bold">${source.price}</span>
                </td>
                <td className="py-4 px-4 text-right">
                  {i === 0 ? (
                    <span className="font-semibold text-primary">{t('bestPrice', locale)} ✅</span>
                  ) : (
                    <span className="text-destructive">+${source.price - bestPrice}</span>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      i === 0
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {i === 0 ? t('bookNow', locale) : t('viewDeal', locale)}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        💡 {t('priceTip', locale)}
      </p>
    </div>
  );
};

export default PriceComparisonTable;
