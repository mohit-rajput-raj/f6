'use client';
import { useUsersQueries } from '@/actions/getQueries/userQueries';
import React from 'react'

type Props = {}

const Analytics = (props: Props) => {
  const {data:users , refetch} = useUsersQueries();
  return (
    <div>Analytics
      <button onClick={()=>refetch()} className='button p-3 rounded-b-sm border-2'>reload</button>
      <div>
        {users && users.map((user:any)=>(
          <div key={user.id}>{user.name}</div>
        ))}
      </div>
    </div>
  )
}

export default Analytics