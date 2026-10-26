import { Button } from '@heroui/react'
import { CircleAlert } from 'lucide-react'

interface AuthErrorStateProps {
  message: string
  onRetry: () => void
}

export default function AuthErrorState({
  message,
  onRetry,
}: AuthErrorStateProps) {
  return (
    <div className="flex h-dvh items-center justify-center bg-background px-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <CircleAlert className="size-8 text-accent" aria-hidden />
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold">Could not load your profile</h1>
          <p className="text-sm text-muted">{message}</p>
        </div>
        <Button variant="primary" onPress={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}
