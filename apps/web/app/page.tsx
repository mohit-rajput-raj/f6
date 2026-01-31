// 'use client'
import { TabsDemo } from '@/components/tabs/signuptabs'
import React from 'react'
import {prisma} from '@repo/db'
type Props = {}

const page =  async(props: Props) => {
  const users = await prisma.user.findMany();
  console.log(users);
  

  return (
    <div>
      hell
      <TabsDemo />
    </div>
  )
}

export default page
