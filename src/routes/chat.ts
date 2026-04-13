// ============================================================
// AI Chat Routes: /api/chat/send, /api/chat/voice, /api/chat/threads
// ============================================================
import { Hono } from 'hono'
import { CloudflareBindings } from '../lib/types'
import { requireAuth, requireTier } from '../middleware/auth'
import { extractIntent, generateHotelRecommendation, generateVoiceResponse } from '../lib/ai'
import { generateSpeech, saveAudioToR2 } from '../lib/elevenlabs'
import { searchHotels, normalizeHotel, TRAVELPAYOUTS_MARKER } from '../lib/travelpayouts'
import { generateId } from '../lib/auth'

type Variables = { user: any }

const chat = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>()

// POST /api/chat/send - AI text chat
chat.post('/send', requireAuth, requireTier('traveler'), async (c) => {
  try {
    const { message, thread_id, language } = await c.req.json<{
      message: string
      thread_id?: string
      language?: string
    }>()

    if (!message || message.trim().length === 0) {
      return c.json({ error: 'Message is required' }, 400)
    }

    const user = c.get('user')
    const msgLanguage = language || 'en'

    // Get or create thread
    let threadId = thread_id
    if (!threadId) {
      threadId = generateId()
      await c.env.DB.prepare(`
        INSERT INTO chat_threads (id, user_id, title)
        VALUES (?, ?, ?)
      `).bind(threadId, user.sub, message.slice(0, 60)).run()
    } else {
      // Verify thread belongs to user
      const thread = await c.env.DB.prepare(
        'SELECT id FROM chat_threads WHERE id = ? AND user_id = ?'
      ).bind(threadId, user.sub).first()
      if (!thread) {
        return c.json({ error: 'Thread not found' }, 404)
      }
    }

    // Save user message
    const userMsgId = generateId()
    await c.env.DB.prepare(`
      INSERT INTO chat_messages (id, thread_id, user_id, role, content, language)
      VALUES (?, ?, ?, 'user', ?, ?)
    `).bind(userMsgId, threadId, user.sub, message, msgLanguage).run()

    // Extract intent using AI
    const intent = await extractIntent(message, c.env.LAOZHANG_API_KEY)

    let hotels: any[] = []
    let assistantResponse = ''

    // If search intent, fetch hotels
    if (['search', 'recommend', 'compare'].includes(intent.action) && intent.location) {
      const rawHotels = await searchHotels({
        location: intent.location,
        checkIn: intent.check_in,
        checkOut: intent.check_out,
        adults: intent.guests,
        currency: 'USD',
        language: msgLanguage,
        limit: 10,
        token: c.env.TRAVELPAYOUTS_API_KEY
      })

      hotels = rawHotels.map(h => normalizeHotel(h, c.env.TRAVELPAYOUTS_API_KEY))
      
      // Cache hotels in D1
      for (const hotel of hotels) {
        const id = generateId()
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO hotel_cache (
            id, travelpayouts_id, name, location, city, stars, rating, price, currency,
            image_url, affiliate_link, amenities, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, hotel.travelpayouts_id, hotel.name, hotel.location, hotel.city,
          hotel.stars, hotel.rating, hotel.price, hotel.currency,
          hotel.image_url, hotel.affiliate_link, hotel.amenities, hotel.expires_at
        ).run().catch(() => {})
      }

      assistantResponse = await generateHotelRecommendation(
        hotels, message, intent.segment, c.env.LAOZHANG_API_KEY
      )
    } else {
      // General question / info
      const { callAI } = await import('../lib/ai')
      assistantResponse = await callAI([
        { role: 'system', content: 'You are a helpful hotel booking assistant for Travel Payout Hotel Finder. Be concise and helpful.' },
        { role: 'user', content: message }
      ], c.env.LAOZHANG_API_KEY, { max_tokens: 300 })
    }

    // Save assistant message
    const assistantMsgId = generateId()
    const hotelIds = hotels.map(h => h.travelpayouts_id).slice(0, 5)
    await c.env.DB.prepare(`
      INSERT INTO chat_messages (id, thread_id, user_id, role, content, hotel_ids, intent, language)
      VALUES (?, ?, ?, 'assistant', ?, ?, ?, ?)
    `).bind(
      assistantMsgId, threadId, user.sub, assistantResponse,
      JSON.stringify(hotelIds), intent.action, msgLanguage
    ).run()

    // Update thread title
    await c.env.DB.prepare(
      'UPDATE chat_threads SET updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(threadId).run()

    return c.json({
      thread_id: threadId,
      message_id: assistantMsgId,
      response: assistantResponse,
      hotels: hotels.slice(0, 5).map(h => ({
        id: h.travelpayouts_id,
        name: h.name,
        location: h.location,
        stars: h.stars,
        rating: h.rating,
        price: h.price,
        currency: h.currency,
        image_url: h.image_url,
        affiliate_link: h.affiliate_link
      })),
      intent: intent.action,
      location: intent.location
    })
  } catch (err: any) {
    console.error('Chat error:', err)
    return c.json({ error: 'Chat failed', message: err.message }, 500)
  }
})

// POST /api/chat/voice - voice chat (drivers' tap-to-talk)
chat.post('/voice', requireAuth, requireTier('traveler'), async (c) => {
  try {
    const { transcript, thread_id, language } = await c.req.json<{
      transcript: string
      thread_id?: string
      language?: string
    }>()

    if (!transcript) {
      return c.json({ error: 'Transcript is required' }, 400)
    }

    const user = c.get('user')

    // Extract intent from voice transcript
    const intent = await extractIntent(transcript, c.env.LAOZHANG_API_KEY)

    let hotels: any[] = []

    if (['search', 'recommend'].includes(intent.action) && intent.location) {
      const rawHotels = await searchHotels({
        location: intent.location,
        checkIn: intent.check_in,
        adults: intent.guests,
        currency: 'USD',
        language: language || 'en',
        limit: 5,
        token: c.env.TRAVELPAYOUTS_API_KEY
      })
      hotels = rawHotels.map(h => normalizeHotel(h, c.env.TRAVELPAYOUTS_API_KEY))
    }

    // Generate short voice-optimized response
    const responseText = await generateVoiceResponse(transcript, hotels, c.env.LAOZHANG_API_KEY)

    // Generate TTS audio using ElevenLabs
    let audioUrl: string | null = null
    if (c.env.ELEVENLABS_API_KEY) {
      const audioBuffer = await generateSpeech({ text: responseText }, c.env.ELEVENLABS_API_KEY)
      if (audioBuffer && c.env.BUCKET) {
        const audioKey = `voice/${user.sub}/${generateId()}.mp3`
        await saveAudioToR2(audioBuffer, audioKey, c.env.BUCKET)
        audioUrl = `/api/audio/${audioKey}`
      }
    }

    // Save voice message record
    const voiceId = generateId()
    await c.env.DB.prepare(`
      INSERT INTO voice_messages (id, user_id, thread_id, transcript, response_text, response_audio_url, language)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(voiceId, user.sub, thread_id || null, transcript, responseText, audioUrl, language || 'en').run()

    return c.json({
      voice_id: voiceId,
      transcript,
      response_text: responseText,
      audio_url: audioUrl,
      hotels: hotels.slice(0, 3).map(h => ({
        name: h.name,
        location: h.location,
        price: h.price,
        currency: h.currency,
        stars: h.stars,
        affiliate_link: h.affiliate_link,
        has_parking: !!h.has_parking,
        has_truck_parking: !!h.has_truck_parking
      })),
      intent: intent.action,
      location: intent.location
    })
  } catch (err: any) {
    console.error('Voice chat error:', err)
    return c.json({ error: 'Voice chat failed', message: err.message }, 500)
  }
})

// GET /api/chat/threads - list user chat threads
chat.get('/threads', requireAuth, async (c) => {
  const user = c.get('user')
  const limit = parseInt(c.req.query('limit') || '20')

  const { results } = await c.env.DB.prepare(`
    SELECT t.id, t.title, t.created_at, t.updated_at,
           (SELECT content FROM chat_messages WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM chat_threads t
    WHERE t.user_id = ?
    ORDER BY t.updated_at DESC
    LIMIT ?
  `).bind(user.sub, limit).all<any>()

  return c.json({ threads: results })
})

// GET /api/chat/threads/:id - get thread messages
chat.get('/threads/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const threadId = c.req.param('id')

  const thread = await c.env.DB.prepare(
    'SELECT * FROM chat_threads WHERE id = ? AND user_id = ?'
  ).bind(threadId, user.sub).first<any>()

  if (!thread) return c.json({ error: 'Thread not found' }, 404)

  const { results: messages } = await c.env.DB.prepare(`
    SELECT id, role, content, hotel_ids, intent, language, created_at
    FROM chat_messages
    WHERE thread_id = ?
    ORDER BY created_at ASC
  `).bind(threadId).all<any>()

  return c.json({
    thread,
    messages: messages.map(m => ({
      ...m,
      hotel_ids: m.hotel_ids ? JSON.parse(m.hotel_ids) : []
    }))
  })
})

// DELETE /api/chat/threads/:id - delete thread
chat.delete('/threads/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const threadId = c.req.param('id')

  const result = await c.env.DB.prepare(
    'DELETE FROM chat_threads WHERE id = ? AND user_id = ?'
  ).bind(threadId, user.sub).run()

  if (result.meta.changes === 0) return c.json({ error: 'Thread not found' }, 404)
  return c.json({ success: true })
})

// GET /api/audio/:path* - serve R2 audio files
chat.get('/audio/*', requireAuth, async (c) => {
  const key = c.req.path.replace('/api/audio/', '')
  
  if (!c.env.BUCKET) return c.json({ error: 'Storage not configured' }, 503)
  
  const object = await c.env.BUCKET.get(key)
  if (!object) return c.json({ error: 'Audio not found' }, 404)

  return new Response(object.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=3600'
    }
  })
})

export default chat
