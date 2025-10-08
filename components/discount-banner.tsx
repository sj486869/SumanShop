"use client"

import { useEffect, useState } from "react"
import { getSettings, type DiscountSettings } from "@/lib/settings"
import { Sparkles, Tag } from "lucide-react"

export function DiscountBanner() {
  const [discount, setDiscount] = useState<DiscountSettings | null>(null)

  useEffect(() => {
    const settings = getSettings()
    if (settings.discount.enabled && settings.discount.value > 0) {
      setDiscount(settings.discount)
    }
  }, [])

  if (!discount) return null

  return (
    <div className="relative overflow-hidden mb-8">
      <div className="glass-card rounded-2xl p-6 card-3d border-2 border-yellow-400/30 relative">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-pink-500/20 animate-gradient-x" />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-pulse">
              <Tag className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
                <h2 className="text-2xl font-bold text-white neon-text">SPECIAL OFFER!</h2>
                <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
              </div>
              <p className="text-white/90 text-lg">
                Get{" "}
                <span className="font-bold text-yellow-300 text-2xl">
                  {discount.type === "percentage" ? `${discount.value}% OFF` : `$${discount.value} OFF`}
                </span>{" "}
                on all products!
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg hover-3d cursor-default">
            LIMITED TIME ONLY
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-400/10 rounded-full blur-3xl" />
      </div>
    </div>
  )
}
