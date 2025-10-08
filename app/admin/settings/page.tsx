"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminGuard } from "@/components/admin-guard"
import { AdminHeader } from "@/components/admin-header"
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Plus, Save, Calendar as CalendarIcon } from "lucide-react"

// Types matching your Supabase schema
interface Discount { id: string; name: string; percentage: number; active: boolean; created_at: string }
interface Sale { id: string; product_id: string; discount_id: string | null; start_date: string | null; end_date: string | null; created_at: string }
interface PaymentMethod {
  id: string
  method_name: string
  active: boolean
  upi_qr: string | null
  upi_id: string | null
  binance_qr: string | null
  binance_id: string | null
  paypal_qr: string | null
  paypal_id: string | null
  created_at: string
}

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <SettingsContent />
    </AdminGuard>
  )
}

function SettingsContent() {
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [methods, setMethods] = useState<PaymentMethod[]>([])

  const [newDiscount, setNewDiscount] = useState<{ name: string; percentage: number; active: boolean }>({ name: "", percentage: 0, active: true })

  // Load initial data
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadDiscounts(), loadSales(), loadPaymentMethods()])
      setLoading(false)
    }
    load()

    // Realtime subscriptions — reflect changes across devices instantly
    const channel = supabase
      .channel("admin-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "discounts" }, () => loadDiscounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => loadSales())
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_methods" }, () => loadPaymentMethods())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const loadDiscounts = async () => {
    const { data, error } = await supabase
      .from("discounts")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) {
      console.error("[admin] loadDiscounts error", error)
      return
    }
    setDiscounts(data || [])
  }

  const loadSales = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) {
      console.error("[admin] loadSales error", error)
      return
    }
    setSales(data || [])
  }

  const loadPaymentMethods = async () => {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) {
      console.error("[admin] loadPaymentMethods error", error)
      return
    }
    setMethods(data || [])
  }

  // Discount actions
  const addDiscount = async () => {
    if (!newDiscount.name || newDiscount.percentage <= 0) {
      toast({ title: "Invalid", description: "Provide a name and positive percentage", variant: "destructive" })
      return
    }
    const { error } = await supabase.from("discounts").insert({
      name: newDiscount.name,
      percentage: newDiscount.percentage,
      active: newDiscount.active,
    })
    if (error) {
      console.error("[admin] addDiscount error", error)
      toast({ title: "Error", description: "Failed to add discount", variant: "destructive" })
      return
    }
    setNewDiscount({ name: "", percentage: 0, active: true })
    toast({ title: "Added", description: "Discount created" })
  }

  const toggleDiscountActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("discounts").update({ active }).eq("id", id)
    if (error) {
      console.error("[admin] toggleDiscountActive error", error)
      toast({ title: "Error", description: "Failed to update discount", variant: "destructive" })
    }
  }

  const updateDiscountPercent = async (id: string, percentage: number) => {
    const { error } = await supabase.from("discounts").update({ percentage }).eq("id", id)
    if (error) {
      console.error("[admin] updateDiscountPercent error", error)
      toast({ title: "Error", description: "Failed to update percentage", variant: "destructive" })
    }
  }

  // Sales actions
  const updateSaleEndDate = async (id: string, newDate: string) => {
    const { error } = await supabase.from("sales").update({ end_date: newDate }).eq("id", id)
    if (error) {
      console.error("[admin] updateSaleEndDate error", error)
      toast({ title: "Error", description: "Failed to update sale end date", variant: "destructive" })
      return
    }
    toast({ title: "Updated", description: "Sale end date updated" })
  }

  // Payment method actions — one row per method_name
  const upsertMethod = async (method_name: string, patch: Partial<PaymentMethod>) => {
    // Find existing row
    const existing = methods.find((m) => m.method_name === method_name)
    if (existing) {
      const { error } = await supabase
        .from("payment_methods")
        .update(patch)
        .eq("id", existing.id)
      if (error) {
        console.error("[admin] upsertMethod update error", error)
        toast({ title: "Error", description: `Failed to update ${method_name}`, variant: "destructive" })
        return
      }
    } else {
      const { error } = await supabase
        .from("payment_methods")
        .insert({ method_name, active: true, ...patch })
      if (error) {
        console.error("[admin] upsertMethod insert error", error)
        toast({ title: "Error", description: `Failed to create ${method_name}`, variant: "destructive" })
        return
      }
    }
    toast({ title: "Saved", description: `${method_name} updated` })
  }

  const getField = (method_name: string, field: keyof PaymentMethod): string => {
    const m = methods.find((x) => x.method_name === method_name)
    return (m?.[field] as string | null) ?? ""
  }
  const isActive = (method_name: string): boolean => methods.find((x) => x.method_name === method_name)?.active ?? false

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <AdminHeader />
      <main className="container py-8">
        <AdminNav />

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-white/80">Manage discounts, sales, and payment methods (Synced with Supabase)</p>
          </div>

          <Tabs defaultValue="discounts" className="space-y-6">
            <TabsList className="bg-white/10 backdrop-blur border-white/20">
              <TabsTrigger value="discounts">Discounts & Sales</TabsTrigger>
              <TabsTrigger value="payments">Payment Methods</TabsTrigger>
            </TabsList>

            {/* Discounts & Sales */}
            <TabsContent value="discounts" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Discounts</CardTitle>
                  <CardDescription className="text-white/80">Create and manage discounts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add discount */}
                  <div className="grid md:grid-cols-3 gap-3">
                    <Input placeholder="Discount name" value={newDiscount.name} onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })} />
                    <Input type="number" placeholder="Percentage" value={newDiscount.percentage}
                      onChange={(e) => setNewDiscount({ ...newDiscount, percentage: Number(e.target.value) })} />
                    <div className="flex items-center gap-3">
                      <Switch checked={newDiscount.active} onCheckedChange={(v) => setNewDiscount({ ...newDiscount, active: v })} />
                      <Button onClick={addDiscount}><Plus className="h-4 w-4 mr-2" />Add</Button>
                    </div>
                  </div>

                  {/* List discounts */}
                  <div className="space-y-2">
                    {discounts.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-md border border-white/20">
                        <div className="flex-1">
                          <div className="font-semibold">{d.name}</div>
                          <div className="text-sm text-white/80">{d.percentage}% • {d.active ? "Active" : "Inactive"}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Input className="w-28" type="number" value={d.percentage}
                            onChange={(e) => updateDiscountPercent(d.id, Number(e.target.value))} />
                          <Switch checked={d.active} onCheckedChange={(v) => toggleDiscountActive(d.id, v)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Sales</CardTitle>
                  <CardDescription className="text-white/80">Manage sale periods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sales.length === 0 && <div className="text-white/70">No sales defined</div>}
                  {sales.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-md border border-white/20">
                      <div className="flex-1 text-sm">
                        <div>Sale #{s.id.slice(0,8)}</div>
                        <div className="text-white/70">Product: {s.product_id?.slice(0,8) || "-"} • Discount: {s.discount_id?.slice(0,8) || "none"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <Input type="datetime-local" className="w-56" value={s.end_date ? new Date(s.end_date).toISOString().slice(0,16) : ""}
                          onChange={(e) => updateSaleEndDate(s.id, new Date(e.target.value).toISOString())} />
                        <Button variant="outline" onClick={() => updateSaleEndDate(s.id, new Date().toISOString())}><Save className="h-4 w-4 mr-2"/>Save</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Methods */}
            <TabsContent value="payments" className="space-y-6">
              {/* Binance Pay */}
              <PaymentCard
                title="Binance Pay"
                description="Manage Binance Pay QR and ID"
                active={isActive("Binance Pay")}
                onToggle={(v) => upsertMethod("Binance Pay", { active: v })}
                fields={[
                  { label: "Binance ID", value: getField("Binance Pay", "binance_id"), onChange: (v) => upsertMethod("Binance Pay", { binance_id: v }) },
                  { label: "Binance QR URL", value: getField("Binance Pay", "binance_qr"), onChange: (v) => upsertMethod("Binance Pay", { binance_qr: v }) },
                ]}
              />

              {/* PhonePe UPI */}
              <PaymentCard
                title="PhonePe UPI"
                description="Manage UPI QR and UPI ID"
                active={isActive("PhonePe UPI")}
                onToggle={(v) => upsertMethod("PhonePe UPI", { active: v })}
                fields={[
                  { label: "UPI ID", value: getField("PhonePe UPI", "upi_id"), onChange: (v) => upsertMethod("PhonePe UPI", { upi_id: v }) },
                  { label: "UPI QR URL", value: getField("PhonePe UPI", "upi_qr"), onChange: (v) => upsertMethod("PhonePe UPI", { upi_qr: v }) },
                ]}
              />

              {/* PayPal */}
              <PaymentCard
                title="PayPal"
                description="Manage PayPal QR and ID"
                active={isActive("PayPal")}
                onToggle={(v) => upsertMethod("PayPal", { active: v })}
                fields={[
                  { label: "PayPal ID/Email", value: getField("PayPal", "paypal_id"), onChange: (v) => upsertMethod("PayPal", { paypal_id: v }) },
                  { label: "PayPal QR URL", value: getField("PayPal", "paypal_qr"), onChange: (v) => upsertMethod("PayPal", { paypal_qr: v }) },
                ]}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

function PaymentCard({
  title,
  description,
  active,
  onToggle,
  fields,
}: {
  title: string
  description: string
  active: boolean
  onToggle: (v: boolean) => void
  fields: { label: string; value: string; onChange: (v: string) => void }[]
}) {
  const [localActive, setLocalActive] = useState(active)
  useEffect(() => setLocalActive(active), [active])

  return (
    <Card className="bg-white/10 backdrop-blur border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">{title}</CardTitle>
            <CardDescription className="text-white/80">{description}</CardDescription>
          </div>
          <Switch checked={localActive} onCheckedChange={(v) => { setLocalActive(v); onToggle(v) }} />
        </div>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.label} className="space-y-2">
            <Label>{f.label}</Label>
            <Input value={f.value || ""} onChange={(e) => f.onChange(e.target.value)} placeholder={`Enter ${f.label}`} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
