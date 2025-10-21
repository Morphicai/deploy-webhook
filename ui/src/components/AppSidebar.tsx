import { NavLink } from 'react-router-dom'
import { BarChart3, Zap, Settings, Key, HelpCircle, LogOut } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const menuItems = [
  {
    to: '/',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    to: '/deploy',
    label: 'Deploy',
    icon: Zap,
  },
  {
    to: '/env',
    label: 'Environment',
    icon: Settings,
  },
  {
    to: '/secrets',
    label: 'Secrets',
    icon: Key,
  },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="text-base font-bold">
              Deploy Console
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                          isActive ? 'bg-accent text-accent-foreground' : ''
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="mx-3 rounded-xl border bg-card p-4">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
              <p className="mb-1 text-sm font-semibold">
                Need help?
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Feel free to contact
              </p>
              <Button size="sm" className="w-full">
                Get support
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              AD
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">
              Admin User
            </div>
            <div className="text-xs text-muted-foreground truncate">
              admin@example.com
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

