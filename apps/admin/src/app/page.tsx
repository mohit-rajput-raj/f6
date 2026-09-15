import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-neutral-900 dark:bg-black dark:text-neutral-100">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-4 h-10 w-10 rounded-xl bg-black dark:bg-white" />
        <h1 className="text-3xl font-bold tracking-tight">Campus Admin</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Admin portal for managing users, subscribers, analytics, and platform settings.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-black text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="flex h-11 flex-1 items-center justify-center rounded-lg border border-neutral-300 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
