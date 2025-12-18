
'use client'
import ProjectList from '@/components/projects/table'
import { useRouteAuthContextHook } from '@/context/routeContext';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react'

type Props = {}

const Projects = (props: Props) => {
  const {dash_id , main_id} = useRouteAuthContextHook();
  const router = useRouter();
  useEffect(() => {
    if(main_id){
      const url = `/projects/${main_id}/projects`;
      router.push(url);
    }
    
  },[dash_id, main_id, router]);
  return (
    <div>projects</div>
  )
}

export default Projects