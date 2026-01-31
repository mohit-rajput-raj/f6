"use client"


import { useRouter } from 'next/navigation'
import { ModeToggle } from '@repo/ui/components/themes/toogle'
import { useRouteAuthContextHook } from '@/context/routeContext'
import { useSession, signOut } from "@/lib/auth-client";
// import {} from "@repo/orpc"
type Props = {}
import {client} from '@/lib/orpc';
const Header = (props: Props) => {
  // client.users.list().then(console.log);
    const router = useRouter();
    const {main_id}=useRouteAuthContextHook()
    const { data: session } = useSession();
    // const userId = "12"
    // const {userId} = await clerkuser()
  return (
    <header className="flex justify-end items-center p-4 gap-4 h-16  w-full top-0 left-0 z-20 fixed">
      {session?.user ? (
        <button onClick={() => signOut()}>Sign out</button>
      ) : (
        <a href="/sign-in">Sign in</a>
      )}
                    
                     <a  href={`/projects/${main_id}/projects`} >dashboard</a>
                    <ModeToggle/>
        
                  </header>
  )
}

export default Header