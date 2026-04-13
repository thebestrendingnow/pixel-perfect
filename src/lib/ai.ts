// ============================================================
// AI Integration - LaoZhang/KIE.ai (OpenAI-compatible endpoint)
// Used for: Intent extraction, hotel recommendations, chat
// ============================================================

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ExtractedIntent {
  action: 'search' | 'compare' | 'recommend' | 'info' | 'voice_search' | 'unknown'
  location?: string
  city?: string
  check_in?: string
  check_out?: string
  guests?: number
  budget_max?: number
  stars?: number
  segment?: 'business' | 'driver' | 'couple' | 'family' | 'solo'
  filters?: {
    has_parking?: boolean
    has_truck_parking?: boolean
    is_family_friendly?: boolean
    is_pet_friendly?: boolean
    has_breakfast?: boolean
    highway_access?: boolean
  }
  language?: string
  raw_query: string
}

const SYSTEM_PROMPT = `You are a helpful hotel booking assistant for Travel Payout Hotel Finder. 
You help users find the perfect hotel based on their needs. 
You understand these user segments:
- Business Travelers: Need fast booking, receipts, expense reports, corporate rates, loyalty programs
- Delivery/Truck Drivers: Need cheap clean rooms, truck parking, highway access, no-frills stays
- Couples: Want romance, spa, reviews, special deals, amenities
- Families: Need space, kid-friendly, pool, activities nearby
- Solo Travelers: Budget-focused, safety, sometimes social options

When recommending hotels, provide concise, helpful responses with key details.
Always include affiliate links provided by the search results.
Support 13 languages: English, Dutch, Papiamento, Sranan Tongo, Urdu, Spanish, Hindi, Arabic, French, German, Portuguese, Chinese, Japanese.
Respond in the same language the user writes in.`

export async function extractIntent(userMessage: string, apiKey: string): Promise<ExtractedIntent> {
  const prompt = `Extract the hotel search intent from this message. Return ONLY valid JSON.

Message: "${userMessage}"

Return JSON with these fields (all optional except action and raw_query):
{
  "action": "search|compare|recommend|info|unknown",
  "location": "city/area name",
  "city": "city name",
  "check_in": "YYYY-MM-DD or null",
  "check_out": "YYYY-MM-DD or null",
  "guests": number,
  "budget_max": number or null,
  "stars": number or null,
  "segment": "business|driver|couple|family|solo or null",
  "filters": {
    "has_parking": boolean,
    "has_truck_parking": boolean,
    "is_family_friendly": boolean,
    "highway_access": boolean
  },
  "language": "en|es|fr|de|nl|ar|zh|ja|pt|hi|ur|pap|srn",
  "raw_query": "${userMessage}"
}`

  try {
    const response = await callAI([{ role: 'user', content: prompt }], apiKey, { max_tokens: 500, temperature: 0 })
    
    // Clean and parse JSON
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { ...parsed, raw_query: userMessage }
  } catch {
    return { action: 'search', raw_query: userMessage }
  }
}

export async function generateHotelRecommendation(
  hotels: any[],
  userQuery: string,
  segment: string | undefined,
  apiKey: string
): Promise<string> {
  const hotelSummary = hotels.slice(0, 5).map((h, i) => 
    `${i + 1}. ${h.name} - $${h.price}/night - ${h.stars}⭐ - Rating: ${h.rating}/10 - ${h.location}`
  ).join('\n')

  const messages: ChatCompletionMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { 
      role: 'user', 
      content: `User asked: "${userQuery}"
${segment ? `User type: ${segment}` : ''}

Available hotels:
${hotelSummary}

Please give a helpful, concise recommendation (2-3 sentences max). Mention the best option and why.`
    }
  ]

  return await callAI(messages, apiKey, { max_tokens: 300, temperature: 0.7 })
}

export async function generateVoiceResponse(
  transcript: string,
  hotels: any[],
  apiKey: string
): Promise<string> {
  const hotelSummary = hotels.slice(0, 3).map((h, i) =>
    `Option ${i + 1}: ${h.name}, ${h.location}, ${h.stars} stars, $${h.price} per night`
  ).join('. ')

  const messages: ChatCompletionMessage[] = [
    { role: 'system', content: `${SYSTEM_PROMPT} Keep responses SHORT (under 50 words) for voice playback.` },
    {
      role: 'user',
      content: `Voice request: "${transcript}"
Hotels found: ${hotelSummary || 'No hotels found'}
Give a brief verbal response (2-3 short sentences max, suitable for text-to-speech).`
    }
  ]

  return await callAI(messages, apiKey, { max_tokens: 150, temperature: 0.7 })
}

export async function callAI(
  messages: ChatCompletionMessage[],
  apiKey: string,
  options: { max_tokens?: number; temperature?: number } = {}
): Promise<string> {
  // LaoZhang/KIE.ai OpenAI-compatible endpoint
  const response = await fetch('https://api.laozhang.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: options.max_tokens || 500,
      temperature: options.temperature ?? 0.7
    }),
    signal: AbortSignal.timeout(15000)
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`AI API error ${response.status}: ${err}`)
  }

  const data = await response.json() as any
  return data.choices?.[0]?.message?.content || ''
}
