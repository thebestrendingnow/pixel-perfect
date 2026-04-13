import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockHotels } from '@/data/mockHotels';
import { t, type Locale } from '@/lib/i18n';
import { api } from '@/services/api';
import type { ChatMessage } from '@/types/hotel';

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  locale?: Locale;
}

const getAIResponse = (userMsg: string): string => {
  const lower = userMsg.toLowerCase();

  if (lower.includes('parking') || lower.includes('truck') || lower.includes('vehicle')) {
    const matches = mockHotels.filter(h => h.hasParking && h.pricePerNight < 80);
    if (matches.length > 0) {
      return `Great question! Here are budget hotels with parking:\n\n${matches
        .slice(0, 3)
        .map(h => `🏨 **${h.name}** — ${h.city} — $${h.pricePerNight}/night\n   ${h.hasLateCheckIn ? '✅ Late check-in' : ''} ${h.hasPetFriendly ? '🐾 Pet friendly' : ''}`)
        .join('\n\n')}\n\nWant me to find more options?`;
    }
  }

  if (lower.includes('cheap') || lower.includes('budget') || lower.includes('under')) {
    const priceMatch = lower.match(/under\s*\$?(\d+)/);
    const maxPrice = priceMatch ? parseInt(priceMatch[1]) : 70;
    const matches = mockHotels.filter(h => h.pricePerNight <= maxPrice);
    if (matches.length > 0) {
      return `Found ${matches.length} hotels under $${maxPrice}:\n\n${matches
        .slice(0, 3)
        .map(h => `🏨 **${h.name}** — ${h.city} — $${h.pricePerNight}/night\n   ⭐ ${h.rating} rating`)
        .join('\n\n')}\n\nWant me to filter by amenities?`;
    }
    return `No hotels found under $${maxPrice}. Try a higher budget or different city!`;
  }

  if (lower.includes('atlanta') || lower.includes('miami') || lower.includes('dallas') || lower.includes('nashville')) {
    const city = lower.includes('atlanta') ? 'Atlanta' : lower.includes('miami') ? 'Miami' : lower.includes('dallas') ? 'Dallas' : 'Nashville';
    const matches = mockHotels.filter(h => h.city === city);
    return `Found ${matches.length} hotels in ${city}:\n\n${matches
      .map(h => `🏨 **${h.name}** — $${h.pricePerNight}/night — ⭐ ${h.rating}\n   ${h.amenities.slice(0, 3).join(', ')}`)
      .join('\n\n')}\n\nNeed help picking the best one?`;
  }

  if (lower.includes('late') || lower.includes('night') || lower.includes('11') || lower.includes('midnight')) {
    const matches = mockHotels.filter(h => h.hasLateCheckIn);
    return `Hotels with late check-in (perfect for drivers finishing late shifts!):\n\n${matches
      .slice(0, 3)
      .map(h => `🏨 **${h.name}** — ${h.city} — $${h.pricePerNight}/night\n   🕐 Check-in: ${h.checkInTime}`)
      .join('\n\n')}`;
  }

  if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat')) {
    const matches = mockHotels.filter(h => h.hasPetFriendly);
    return `Pet-friendly hotels:\n\n${matches
      .slice(0, 3)
      .map(h => `🏨 **${h.name}** — ${h.city} — $${h.pricePerNight}/night\n   🐾 Pet friendly • ${h.hasParking ? '🅿️ Parking' : ''}`)
      .join('\n\n')}`;
  }

  return `I can help you find the perfect hotel! Try asking me:\n\n• "Find cheap hotels with parking"\n• "Hotels in Atlanta under $80"\n• "Late check-in hotels near I-95"\n• "Pet-friendly stays in Nashville"\n\nWhat are you looking for? 🚗`;
};

const AIChatPanel = ({ open, onClose, locale = 'en' }: AIChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('aiGreeting', locale),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    const msgText = input.trim();
    setInput('');
    setTyping(true);

    // Try real SSE streaming API first
    const assistantId = (Date.now() + 1).toString();
    let streamedContent = '';
    let streamWorked = false;

    const worked = await api.streamChat(
      msgText,
      (token) => {
        streamedContent += token;
        streamWorked = true;
        setTyping(false);
        setMessages(prev => {
          const existing = prev.find(m => m.id === assistantId);
          if (existing) {
            return prev.map(m => m.id === assistantId ? { ...m, content: streamedContent } : m);
          }
          return [...prev, { id: assistantId, role: 'assistant' as const, content: streamedContent, timestamp: new Date() }];
        });
      },
      (hotels) => {
        if (hotels.length > 0) {
          const hotelList = hotels.slice(0, 3).map((h: any) =>
            `🏨 **${h.name}** — ${h.location || h.city} — $${h.price}/night`
          ).join('\n');
          streamedContent += '\n\n' + hotelList;
        }
      }
    );

    if (!worked && !streamWorked) {
      // Fallback to local mock
      await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
      const response: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: getAIResponse(msgText),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, response]);
    }

    setTyping(false);
  };

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border bg-background shadow-2xl sm:w-[420px]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
            {t('aiFinder', locale)}
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-4">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('askAboutHotels', locale)}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AIChatPanel;
