export interface DiscountSettings {
  enabled: boolean
  type: "percentage" | "fixed"
  value: number
}

export interface PaymentMethodConfig {
  name: string
  description: string
  qrCode: string
  address: string
  enabled: boolean
}

export interface SiteSettings {
  discount: DiscountSettings
  paymentMethods: {
    binance: PaymentMethodConfig
    upi: PaymentMethodConfig
    paypal: PaymentMethodConfig
  }
}

const SETTINGS_KEY = "site_settings"

const defaultSettings: SiteSettings = {
  discount: {
    enabled: false,
    type: "percentage",
    value: 0,
  },
  paymentMethods: {
    binance: {
      name: "Binance Pay",
      description: "Scan with Binance App to pay",
      qrCode: "/binance-qr-new.jpg",
      address: "User-4a7ec",
      enabled: true,
    },
    upi: {
      name: "PhonePe UPI",
      description: "Scan & Pay Using PhonePe App",
      qrCode: "/phonepe-qr.jpg",
      address: "PANCHANAN JANA",
      enabled: true,
    },
    paypal: {
      name: "PayPal",
      description: "Pay with PayPal",
      qrCode: "/paypal-qr.jpg",
      address: "satyabanpain0@gmail.com",
      enabled: true,
    },
  },
}

export function getSettings(): SiteSettings {
  if (typeof window === "undefined") return defaultSettings

  const stored = localStorage.getItem(SETTINGS_KEY)
  if (!stored) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings))
    return defaultSettings
  }

  return JSON.parse(stored)
}

export function updateSettings(settings: SiteSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function calculateDiscount(total: number): { discountAmount: number; finalTotal: number } {
  const settings = getSettings()

  if (!settings.discount.enabled || settings.discount.value <= 0) {
    return { discountAmount: 0, finalTotal: total }
  }

  let discountAmount = 0

  if (settings.discount.type === "percentage") {
    discountAmount = (total * settings.discount.value) / 100
  } else {
    discountAmount = settings.discount.value
  }

  const finalTotal = Math.max(0, total - discountAmount)

  return { discountAmount, finalTotal }
}
