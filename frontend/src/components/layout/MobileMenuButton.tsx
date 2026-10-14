import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      className="mobile-menu"
      variant="ghost"
      size="icon"
      aria-label="Abrir menú"
      onClick={onClick}
    >
      <Menu />
    </Button>
  )
}
