import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { normalizePhone } from '@serag/shared'
import type { WhatsAppSender } from './whatsapp-sender.js'

export function buildOpenWaSendPayload(to: string, content: string) {
  return {
    args: {
      to,
      content,
    },
  }
}

export function formatOpenWaRecipient(phone: string): string {
  const normalized = normalizePhone(phone)
  if (normalized !== null) {
    return `2${normalized}@c.us`
  }
  const cleaned = phone
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D+/g, '')
    .replace(/^00/, '')
  const intl = cleaned.startsWith('0') ? `2${cleaned}` : cleaned
  return `${intl}@c.us`
}

@Injectable()
export class OpenWaSender implements WhatsAppSender {
  constructor(private readonly config?: ConfigService) {}

  private getUrl(): string | undefined {
    return this.config?.get<string>('OPEN_WA_URL') ?? process.env.OPEN_WA_URL
  }

  private getKey(): string | undefined {
    return this.config?.get<string>('OPEN_WA_KEY') ?? process.env.OPEN_WA_KEY
  }

  isConfigured(): boolean {
    const url = this.getUrl()
    const key = this.getKey()
    return Boolean(url && url.trim().length > 0 && key && key.trim().length > 0)
  }

  async send(to: string, text: string): Promise<void> {
    const url = this.getUrl()
    const key = this.getKey()
    if (!url || !key) {
      throw new Error('open-wa is not configured')
    }

    const recipient = formatOpenWaRecipient(to)
    const payload = buildOpenWaSendPayload(recipient, text)
    const endpoint = `${url.replace(/\/$/, '')}/sendText`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        key,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      throw new Error(`open-wa request failed with HTTP ${response.status}: ${response.statusText}`)
    }

    const body = (await response.json().catch(() => ({}))) as {
      success?: boolean
      [key: string]: unknown
    }

    if (body.success === false) {
      throw new Error('open-wa returned success: false')
    }
  }
}
