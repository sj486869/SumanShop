"use client"

import React from "react"
import Link from "next/link"

export function AdminHeader() {
  return (
    <header className="border-b border-white/10 backdrop-blur bg-white/5 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm">SS</span>
          </div>
          <span className="font-semibold text-white">Admin Panel</span>
        </div>
        <nav className="text-white/80 space-x-4">
          <Link href="/admin" className="hover:text-white">Home</Link>
          <Link href="/admin/orders" className="hover:text-white">Orders</Link>
          <Link href="/admin/products" className="hover:text-white">Products</Link>
          <Link href="/auth/login" className="hover:text-white">Logout</Link>
        </nav>
      </div>
    </header>
  )
}
