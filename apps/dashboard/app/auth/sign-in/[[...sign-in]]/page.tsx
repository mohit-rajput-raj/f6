'use client';  // ← very important!

import { signIn } from '@/lib/auth-client';  // your client exports
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // This redirects the browser to Google
      await signIn.social({
        provider: 'google',
        callbackURL: '/project/0/projects',          // where to go after successful login (e.g. dashboard)
        // redirect: false,        // optional: if you want to handle redirect manually
      });
      // Note: You usually won't reach here because of the redirect
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-8 text-3xl font-bold">Sign In</h1>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex items-center gap-3 rounded-lg bg-white px-6 py-3 text-black shadow hover:bg-gray-100 disabled:opacity-50"
      >
        {loading ? 'Redirecting...' : 'Continue with Google'}
        {/* You can add Google icon here */}
      </button>

      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  );
}