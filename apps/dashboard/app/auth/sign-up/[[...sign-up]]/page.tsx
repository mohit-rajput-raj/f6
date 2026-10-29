'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, type Variants } from 'motion/react';
import { signUp, signIn } from '@/lib/auth-client';
import { IconArrowLeft } from '@tabler/icons-react';
import { VerifyEmailForm } from '../../verify-email/page';
import { sendVerificationOtpAction } from '../../actions';
import { GoogleIcon, AppleIcon } from '@/components/watermelon-ui/auth-10';

export default function SignUpPage() {
  return <SignUpPageLayout />;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

export function SignUpForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<'register' | 'verify'>('register');
  const [registeredEmail, setRegisteredEmail] = useState<string>('');

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn.social(
        {
          provider: 'google',
        },
        {
          onSuccess: () => {
            router.push('/');
          },
        }
      );
    } catch (err: any) {
      setError(err?.message || 'Something went wrong with Google sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailLoading(true);
    setError(null);
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setEmailLoading(false);
      return;
    }

    try {
      await signUp.email(
        {
          name,
          email,
          password,
        },
        {
          onSuccess: async () => {
            setRegisteredEmail(email);
            try {
              await sendVerificationOtpAction(email);
            } catch (e) {
              console.warn('Could not pre-send OTP:', e);
            }
            setAuthMode('verify');
          },
          onError: (ctx) => {
            setError(ctx.error.message || 'Failed to sign up');
          },
        }
      );
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setEmailLoading(false);
    }
  };

  if (authMode === 'verify') {
    return (
      <div className="flex flex-col gap-5 w-full">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
            Step 2: Verify Your Email
          </span>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            <IconArrowLeft className="size-3.5" />
            <span>Back to Registration</span>
          </button>
        </div>

        <VerifyEmailForm
          initialEmail={registeredEmail}
          onVerified={() => {
            router.push(
              `/auth/sign-in?verified=true&email=${encodeURIComponent(registeredEmail)}`
            );
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <motion.div variants={itemVariants} className="mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono border border-neutral-800 bg-neutral-900/60 text-zinc-300 mb-4">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          <span>START 14-DAY ENTERPRISE PILOT</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white">
          Create an account
        </h2>
        <p className="text-sm text-neutral-400 mt-1.5">
          Get started with UNIXL visual DAG spreadsheets in seconds.
        </p>
      </motion.div>

      {error && (
        <motion.div
          variants={itemVariants}
          className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-400 text-center"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleEmailSignUp} className="flex flex-col gap-3.5">
        <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-xs font-mono uppercase tracking-wider text-neutral-300"
          >
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Ada Lovelace"
            required
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-xs font-mono uppercase tracking-wider text-neutral-300"
          >
            Work Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="m@company.com"
            required
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-mono uppercase tracking-wider text-neutral-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••••••"
              required
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-mono uppercase tracking-wider text-neutral-300"
            >
              Confirm
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••••••"
              required
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-primary focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="pt-2">
          <button
            type="submit"
            disabled={emailLoading || loading}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {emailLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </motion.div>
      </form>

      <motion.div
        variants={itemVariants}
        className="relative my-6 flex items-center"
      >
        <div className="grow border-t border-neutral-800"></div>
        <span className="px-4 text-xs font-mono uppercase text-neutral-500">
          Or continue with
        </span>
        <div className="grow border-t border-neutral-800"></div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading || emailLoading}
          className="flex items-center justify-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/50 py-3 text-xs font-medium text-white transition-all hover:bg-neutral-800 hover:border-neutral-700 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <GoogleIcon className="text-base" />
          <span>{loading ? 'Redirecting...' : 'Google'}</span>
        </button>

        <button
          type="button"
          className="flex items-center justify-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/50 py-3 text-xs font-medium text-neutral-400 transition-all hover:bg-neutral-800 hover:border-neutral-700 active:scale-95 cursor-pointer"
          onClick={() => {
            // Enterprise SSO or Apple dummy action
          }}
        >
          <AppleIcon className="text-base" />
          <span>Apple ID</span>
        </button>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="mt-6 text-center text-xs text-neutral-400"
      >
        Already have an account?{' '}
        <Link
          href="/auth/sign-in"
          className="font-semibold text-primary hover:underline ml-1"
        >
          Sign in
        </Link>
      </motion.div>
    </motion.div>
  );
}

export const SignUpPageLayout = () => {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#050505] font-sans text-neutral-200 antialiased selection:bg-primary/30 selection:text-white lg:flex-row">
      {/* Left Visual Panel with Watermelon Auth-10 aesthetic */}
      <div className="relative flex w-full flex-col justify-between overflow-hidden p-8 md:p-12 lg:w-1/2 min-h-[40vh] lg:min-h-screen border-b lg:border-b-0 lg:border-r border-neutral-800/80">
        <img
          src="https://assets.watermelon.sh/auth-10.avif"
          alt="UNIXL Abstract Graphic Background"
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/80" />

        {/* Top Header */}
        <div className="relative z-10 flex w-full items-center justify-between pt-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="size-9 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-primary font-mono font-bold text-sm shadow-md transition-transform group-hover:scale-105">
              UX
            </div>
            <span className="text-2xl font-mono font-bold tracking-tight text-white drop-shadow-md">
              UNIXL
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-mono text-zinc-300/80 hover:text-white transition-colors bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Bottom Hero Pitch */}
        <div className="relative z-10 mb-4 lg:mb-10 flex w-full flex-col items-start justify-center text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md mb-3">
            <span>UNLIMITED PIPELINES · 0 VENDOR LOCK-IN</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl drop-shadow-lg">
            Build data workflows
            <br />
            anyone can audit.
          </h1>
          <p className="mt-3 text-sm text-neutral-300 max-w-md leading-relaxed drop-shadow-md">
            Connect CSVs, databases, spreadsheets, and calculations without
            writing fragile glue code.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex w-full flex-col items-center justify-center p-6 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-md md:max-w-lg">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
};