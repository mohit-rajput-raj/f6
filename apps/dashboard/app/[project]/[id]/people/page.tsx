import React from 'react'
import { prisma } from "@repo/db"
const People = () => {
  const data =  prisma.user.findFirst()
  return (
    <div>
      {JSON.stringify(data)}
    </div>
  )
}

export default People