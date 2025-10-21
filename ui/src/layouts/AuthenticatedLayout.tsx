import { Outlet } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { AppSidebar } from '@/components/AppSidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import ThemeToggle from '@/components/ThemeToggle'

export default function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex flex-1 items-center gap-4">
            <h1 className="text-xl font-semibold">
              Analytics
            </h1>
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </span>
          </div>
          
          {/* Search */}
          <div className="relative hidden md:block flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {/* Notifications */}
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            
            {/* User profile */}
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  KK
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-sm">
                <div className="font-semibold">
                  Keat Kamylova
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
