import { UserButton } from '@clerk/react'

function ChatPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <span className="text-sm font-semibold">rtcamern</span>
        <UserButton />
      </header>
      <main className="flex flex-1 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        Chat UI coming soon.
      </main>
    </div>
  )
}

export default ChatPage
