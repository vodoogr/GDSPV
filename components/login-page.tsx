"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, User, Lock, Users } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

const DEMO_USERS = [
  { username: "admin", role: "Administrador" },
  { username: "Postventa", role: "Operador" },
  { username: "Rico", role: "Supervisor" },
]

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const { login, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!username || !password) {
      setError("Por favor, completa todos los campos")
      return
    }

    const success = await login(username, password)
    if (!success) {
      setError("Usuario o contraseña incorrectos")
    }
  }

  const handleUserSelect = (selectedUsername: string) => {
    setUsername(selectedUsername)
    setError("")
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Administrador":
        return "bg-red-500"
      case "Supervisor":
        return "bg-green-500"
      case "Operador":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo y título */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">G</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">GDSPV</h1>
          <p className="text-slate-600">Gestión de Postventa</p>
        </div>

        {/* Formulario de login */}
        <Card className="backdrop-blur-sm bg-white/80 shadow-xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">Ingresa tus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Ingresa tu usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Iniciando sesión...
                  </div>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Usuarios de demostración */}
        <Card className="backdrop-blur-sm bg-white/60 shadow-lg border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios de Demostración
            </CardTitle>
            <CardDescription className="text-xs">Haz clic en un usuario para seleccionarlo</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.username}
                  onClick={() => handleUserSelect(user.username)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/80 transition-colors text-left w-full"
                  disabled={isLoading}
                >
                  <div className={`w-2 h-2 rounded-full ${getRoleColor(user.role)}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{user.username}</p>
                    <p className="text-xs text-slate-500">{user.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
