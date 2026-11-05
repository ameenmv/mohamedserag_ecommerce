export interface WhatsAppSender {
  send(to: string, text: string): Promise<void>
  isConfigured(): boolean
}

export const WHATSAPP_SENDER = Symbol('WHATSAPP_SENDER')
