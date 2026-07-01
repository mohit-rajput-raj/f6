'use client';  // ← very important!

import { Button, Input } from '@/components/ui/components';
import { signIn } from '@/lib/auth-client';  // your client exports
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@repo/ui/components/ui/field';
import { cn } from '@repo/ui/lib/utils';
import { IconBrandGoogle } from '@tabler/icons-react';
import { GalleryVerticalEnd } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  

  return (
    <LoginPage/>
    // <div className="flex min-h-screen flex-col items-center justify-center p-4">
    //   <h1 className="mb-8 text-3xl font-bold">Sign In</h1>

    //   <button
    //     onClick={handleGoogleSignIn}
    //     disabled={loading}
    //     className="flex items-center gap-3 rounded-lg bg-white px-6 py-3 text-black shadow hover:bg-gray-100 disabled:opacity-50"
    //   >
    //     {loading ? 'Redirecting...' : 'Continue with Google'}
    //     {/* You can add Google icon here */}
    //   </button>

    //   {error && <p className="mt-4 text-red-500">{error}</p>}
    // </div>
  );
}



export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn.social({
        provider: 'google',
      },{
        onSuccess: () => {
          router.push('/');
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailLoading(true);
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    
    try {
      await signIn.email({
        email,
        password,
      }, {
        onSuccess: () => {
          router.push('/');
        },
        onError: (ctx) => {
          setError(ctx.error.message || 'Invalid email or password');
        }
      });
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleEmailSignIn} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>
        {error && <div className="text-sm font-medium text-destructive text-red-500 text-center">{error}</div>}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" name="password" type="password" required />
        </Field>
        <Field>
          <Button type="submit" disabled={emailLoading || loading}>
            {emailLoading ? 'Logging in...' : 'Login'}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={loading || emailLoading}>
            <IconBrandGoogle className="mr-2 h-4 w-4" />
            {loading ? 'Redirecting...' : 'Login with Google'}
          </Button>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <a href="/auth/sign-up" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}

import img from "./image.png"
export const  LoginPage=()=> {
  return (
    <div className="grid w-full h-full lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-muted/80 relative hidden lg:block">
        
        <img
          src={img.src || "./image.png"}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
