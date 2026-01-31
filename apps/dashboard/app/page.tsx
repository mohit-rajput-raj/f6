'use client'
import { SpotlightNewDemo } from "@/components/landing/landingpage";
import Header from "./header";



import { client } from "@/lib/orpc";
import { useEffect } from "react";

export default function Home() {
 useEffect(() => {
  client.users.list().then(console.log);
}, []);
  
  return (<>
    <Header/>
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 pb-20 gap-16 sm:p-10">
      <main className="flex flex-col  row-start-2 items-center sm:items-start">
        <SpotlightNewDemo/>
        {/* {JSON.stringify(data)} */}

        
      </main>
      
    </div>
            </>
  );
}
