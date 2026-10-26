import { SignInButton, SignUpButton } from '@clerk/react'

function AuthPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">rtcamern</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to start chatting.
        </p>
      </div>
      <div className="flex gap-3">
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Sign up
          </button>
        </SignUpButton>
      </div>
    </main>
  )
}

export default AuthPage
