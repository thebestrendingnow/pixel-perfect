// ============================================================
// ElevenLabs Text-to-Speech Integration
// Voice ID: EXAVITQu4vr4xnSDxMaL (Bella) - great for travel
// ============================================================

export const ELEVENLABS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL' // Bella voice

export interface TTSOptions {
  text: string
  voiceId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  modelId?: string
}

export async function generateSpeech(
  options: TTSOptions,
  apiKey: string
): Promise<ArrayBuffer | null> {
  const voiceId = options.voiceId || ELEVENLABS_VOICE_ID
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: options.text.slice(0, 500), // ElevenLabs free tier limit
        model_id: options.modelId || 'eleven_turbo_v2',
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0.0,
          use_speaker_boost: true
        }
      }),
      signal: AbortSignal.timeout(20000)
    })

    if (!response.ok) {
      console.error(`ElevenLabs error: ${response.status} ${await response.text()}`)
      return null
    }

    return await response.arrayBuffer()
  } catch (err) {
    console.error('ElevenLabs TTS error:', err)
    return null
  }
}

export async function saveAudioToR2(
  audioBuffer: ArrayBuffer,
  key: string,
  bucket: R2Bucket
): Promise<string> {
  await bucket.put(key, audioBuffer, {
    httpMetadata: { contentType: 'audio/mpeg' }
  })
  return key
}
