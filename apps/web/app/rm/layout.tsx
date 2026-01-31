import React from 'react'

type Props = {}
import {prisma} from '@repo/db'
const layout =async ({children}: {children:React.ReactNode}) => {
    const users = await prisma.user.findMany();
  console.log(users);
  return (
    <div>{children}</div>
  )
}

export default layout