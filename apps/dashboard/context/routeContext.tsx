'use client'
import React, { useContext, useEffect, useState } from 'react'
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import { useSession } from '@/lib/auth-client';


type InitialValuesProps = {
  main_id: string,
  dash_id: string,
  setDashid: React.Dispatch<React.SetStateAction<string>>,
  setmainid: React.Dispatch<React.SetStateAction<string>>,
  isLoaded: boolean
}

const InitialValues: InitialValuesProps = {
  main_id: "0", 
  dash_id: "0",
  setDashid: () => undefined,
  setmainid: () => undefined,
  isLoaded: false
}

const authContext = React.createContext(InitialValues)

const { Provider } = authContext

const AuthRoutesIdProvider = ({ children }: { children: React.ReactNode }) => {

  console.log(typeof window)
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  //  const { user, isLoaded } = useUser();
  const [main_id, setmainid] = useState<string>("0");
  const [dash_id, setDashid] = useState<string>("0");
  const { data: session, isPending: isPending } = useSession();

  useEffect(() => {
    if (isPending) {
      return
    }
    if (session?.user) {
      setmainid(session?.user.id);
    }
  }, [session]);

  const values = { main_id, dash_id, setDashid, setmainid, isLoaded }


  return <Provider value={values}>
    {isLoaded ? children : <Skeleton />}
  </Provider>
}

export const useRouteAuthContextHook = () => {
  const state = useContext(authContext)
  if (state === InitialValues) {
    throw new Error("useRouteAuthContextHook must be used within AuthRoutesIdProvider")
  }
  return state
}

export default AuthRoutesIdProvider
