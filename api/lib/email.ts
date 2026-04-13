// ============================================================
// Resend Email Integration
// Used for: price alerts, booking confirmations, welcome emails
// ============================================================

export interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail(options: EmailOptions, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: options.from || 'Travel Payout <noreply@travelpayout.app>',
        to: [options.to],
        subject: options.subject,
        html: options.html
      }),
      signal: AbortSignal.timeout(10000)
    })

    return response.ok
  } catch (err) {
    console.error('Email send error:', err)
    return false
  }
}

export function priceAlertEmailHTML(params: {
  userName: string
  hotelName: string
  location: string
  targetPrice: number
  currentPrice: number
  currency: string
  affiliateLink: string
}): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #2563eb; margin: 0 0 20px;">🏨 Price Alert Triggered!</h1>
    <p>Hi ${params.userName},</p>
    <p>Great news! The price for <strong>${params.hotelName}</strong> in ${params.location} has dropped to your target price!</p>
    
    <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px;">
        <span style="text-decoration: line-through; color: #666;">${params.currency} ${params.currentPrice}</span>
        &nbsp;→&nbsp;
        <strong style="color: #16a34a; font-size: 22px;">${params.currency} ${params.targetPrice}</strong>
      </p>
    </div>
    
    <a href="${params.affiliateLink}" 
       style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Book Now 🏨
    </a>
    
    <p style="color: #666; font-size: 12px; margin-top: 20px;">
      Prices may change. Book quickly to secure this rate.<br>
      <a href="#" style="color: #666;">Unsubscribe from price alerts</a>
    </p>
  </div>
</body>
</html>`
}

export function welcomeEmailHTML(params: { userName: string; tier: string }): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
  <div style="background: white; border-radius: 12px; padding: 30px;">
    <h1 style="color: #2563eb;">Welcome to Travel Payout! 🌍</h1>
    <p>Hi ${params.userName},</p>
    <p>You're on the <strong>${params.tier}</strong> plan. Start finding great hotel deals!</p>
    <a href="https://travelpayout.app" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
      Start Searching Hotels
    </a>
  </div>
</body>
</html>`
}
