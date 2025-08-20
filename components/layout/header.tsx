"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User, Settings } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function Header() {
  const { user, logout } = useAuth()

  if (!user) return null

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

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase()
  }

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo y título */}
        <div className="flex items-center gap-3">
          <img src="/placeholder.svg?height=40&width=120" alt="GDSPV Logo" className="h-8 w-auto" />
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">GDSPV</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">Gestión de Postventa</p>
          </div>
        </div>

        {/* Usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{user.username}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{user.role}</p>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className={`${getRoleColor(user.role)} text-white text-xs font-semibold`}>
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
