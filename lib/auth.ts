export interface User {
  id: string
  email: string
  name: string
  role: "user" | "admin"
  createdAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

const USERS_KEY = "crime_zone_users"
const CURRENT_USER_KEY = "crime_zone_current_user"
const ADMIN_PASSWORD = "Mafi123" // Admin password

export function getUsers(): User[] {
  if (typeof window === "undefined") return []
  const users = localStorage.getItem(USERS_KEY)
  return users ? JSON.parse(users) : []
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null
  const user = localStorage.getItem(CURRENT_USER_KEY)
  return user ? JSON.parse(user) : null
}

function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(CURRENT_USER_KEY)
  }
}

export function register(
  email: string,
  password: string,
  name: string,
): { success: boolean; error?: string; user?: User } {
  const users = getUsers()

  if (users.find((u) => u.email === email)) {
    return { success: false, error: "Email already registered" }
  }

  const newUser: User = {
    id: Date.now().toString(),
    email,
    name,
    role: "user",
    createdAt: new Date().toISOString(),
  }

  // Store password separately (in real app, this would be hashed)
  const passwords = JSON.parse(localStorage.getItem("crime_zone_passwords") || "{}")
  passwords[email] = password
  localStorage.setItem("crime_zone_passwords", JSON.stringify(passwords))

  users.push(newUser)
  saveUsers(users)
  setCurrentUser(newUser)

  return { success: true, user: newUser }
}

export function login(email: string, password: string): { success: boolean; error?: string; user?: User } {
  const users = getUsers()
  const passwords = JSON.parse(localStorage.getItem("crime_zone_passwords") || "{}")

  // Check for admin login (original)
  if (email === "admin" && password === ADMIN_PASSWORD) {
    const adminUser: User = {
      id: "admin",
      email: "admin@crimezone.com",
      name: "Admin",
      role: "admin",
      createdAt: new Date().toISOString(),
    }
    setCurrentUser(adminUser)
    return { success: true, user: adminUser }
  }

  if (email === "admin@gmail.com" && password === "admin123") {
    const adminUser: User = {
      id: "admin-gmail",
      email: "admin@gmail.com",
      name: "Admin",
      role: "admin",
      createdAt: new Date().toISOString(),
    }
    setCurrentUser(adminUser)
    return { success: true, user: adminUser }
  }

  const user = users.find((u) => u.email === email)

  if (!user) {
    return { success: false, error: "User not found" }
  }

  if (passwords[email] !== password) {
    return { success: false, error: "Invalid password" }
  }

  setCurrentUser(user)
  return { success: true, user }
}

export function logout() {
  setCurrentUser(null)
}

export function isAdmin(): boolean {
  const user = getCurrentUser()
  return user?.role === "admin"
}
