import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { normalizePhone } from '@serag/shared'
import type { WhatsAppSender } from './whatsapp-sender.js'

/** Body of OpenWA's `POST /api/sessions/{id}/messages/send-text`. */
export function buildOpenWaSendPayload(chatId: string, text: string) {
  return { chatId, text }
}

export function buildOpenWaSendUrl(baseUrl: string, sessionId: string): string {
  return `${baseUrl.replace(/\/$/, '')}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`
}

export function formatOpenWaRecipient(phone: string): string {
  const normalized = normalizePhone(phone)
  if (normalized !== null) {
    return `2${normalized}@c.us`
  }
  const cleaned = phone
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D+/g, '')
    .replace(/^00/, '')
  const intl = cleaned.startsWith('0') ? `2${cleaned}` : cleaned
  return `${intl}@c.us`
}

/** Sends through a self-hosted OpenWA gateway (github.com/rmyndharis/OpenWA). */
@Injectable()
export class OpenWaSender implements WhatsAppSender {
  constructor(private readonly config?: ConfigService) {}

  private read(name: string): string | undefined {
    const value = this.config?.get<string>(name) ?? process.env[name]
    return value && value.trim().length > 0 ? value.trim() : undefined
  }

  isConfigured(): boolean {
    return Boolean(this.read('OPEN_WA_URL') && this.read('OPEN_WA_KEY') && this.read('OPEN_WA_SESSION'))
  }

  async send(to: string, text: string): Promise<void> {
    const url = this.read('OPEN_WA_URL')
    const key = this.read('OPEN_WA_KEY')
    const session = this.read('OPEN_WA_SESSION')
    if (!url || !key || !session) {
      throw new Error('OpenWA is not configured')
    }

    const response = await fetch(buildOpenWaSendUrl(url, session), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': key,
      },
      body: JSON.stringify(buildOpenWaSendPayload(formatOpenWaRecipient(to), text)),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`OpenWA request failed with HTTP ${response.status}: ${detail.slice(0, 200)}`)
    }
  }
}
