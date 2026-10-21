import type { NotifyStatus } from './enums.js'

export interface AdminNotifyProductRow {
  product: {
    id: string
    name: string
    modelCode: string
    slug: string
    stock: number
    available: boolean
  }
  waiting: number
  sent: number
  lastRequestAt: string
}

export interface AdminNotifyEntry {
  id: string
  name: string
  phone: string
  status: NotifyStatus
  createdAt: string
  updatedAt: string
  sentAt: string | null
}

export interface AdminNotifyProductDetail {
  product: AdminNotifyProductRow['product']
  entries: AdminNotifyEntry[]
}

export interface AdminNotifyMarkSentResponse {
  whatsappUrl: string
  entry: AdminNotifyEntry
}
