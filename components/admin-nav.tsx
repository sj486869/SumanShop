"use client"

import React from "react"
import Link from "next/link"

export function AdminNav() {
  return (
    <nav className="my-4">
      <ul className="flex flex-wrap gap-2">
        {[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/orders", label: "Orders" },
          { href: "/admin/products", label: "Products" },
          { href: "/admin/users", label: "Users" },
          { href: "/admin/settings", label: "Settings" },
        ].map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
