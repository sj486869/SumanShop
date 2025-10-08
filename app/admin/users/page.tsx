"use client"

import { useEffect, useState } from "react"
import { Mail, Calendar } from "lucide-react"
import { AdminHeader } from "@/components/admin-header"
import { AdminNav } from "@/components/admin-nav"
import { AdminGuard } from "@/components/admin-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Array<{id:string;name:string;email:string;role?:string;created_at?:string}>>([])

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .order('created_at', { ascending: false })
      if (!error) setUsers(data || [])
    }
    load()

    // Realtime: refresh on users change
    const channel = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <AdminHeader />

        <main className="container py-8">
          <AdminNav />

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Users Management</CardTitle>
              <CardDescription className="text-white/80">View all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date((user as any).created_at ?? (user as any).createdAt ?? new Date().toISOString()).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </AdminGuard>
  )
}
