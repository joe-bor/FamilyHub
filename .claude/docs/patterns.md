# FamilyHub Code Patterns

## Component Structure

```typescript
import { cn } from '@/lib/utils'

interface ComponentProps {
  className?: string
  // Add other props
}

function Component({ className, ...props }: ComponentProps) {
  return (
    <div className={cn("base-classes", className)} {...props}>
      {/* Content */}
    </div>
  )
}

export { Component }
```

## CVA Variants (for buttons, badges, etc.)

```typescript
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const componentVariants = cva(
  "base-classes-applied-to-all",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border bg-background',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        default: 'h-9 px-4',
        lg: 'h-10 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface Props extends VariantProps<typeof componentVariants> {
  className?: string
}

function Component({ className, variant, size, ...props }: Props) {
  return (
    <div className={cn(componentVariants({ variant, size, className }))} {...props} />
  )
}
```

## TypeScript Interfaces (from calendar-data.ts)

```typescript
interface FamilyMember {
  id: string
  name: string
  color: string
  avatar: string
}

interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  date: string
  memberId: string
  isAllDay?: boolean
  location?: string
}

interface ChoreItem {
  id: string
  title: string
  assignedTo: string
  completed: boolean
  dueDate: string
  recurring: 'daily' | 'weekly' | 'monthly' | null
}

interface MealPlan {
  id: string
  date: string
  breakfast?: string
  lunch?: string
  dinner?: string
  notes?: string
}
```

## Import Aliases

```typescript
import { cn } from '@/lib/utils'           // Class name utility
import { Button } from '@/components/ui/button'
import { familyMembers } from '@/lib/calendar-data'
```

## Common Tailwind Patterns

```css
/* Flex layouts */
flex items-center justify-between
flex flex-col gap-4

/* Card styling */
bg-card rounded-lg border p-4 shadow-sm

/* Text hierarchy */
text-lg font-semibold text-foreground
text-sm text-muted-foreground

/* Interactive states */
hover:bg-accent transition-colors cursor-pointer

/* Family member badge */
bg-coral/20 text-coral px-2 py-1 rounded-full text-xs font-medium
```
