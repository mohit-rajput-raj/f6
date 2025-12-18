import Flow from '@/app/[project]/dash/[dashid]/editor/_components/reactFlow'
import { WorkFlowEditor } from '@/app/[project]/dash/[dashid]/editor/_components/resizable'


type Props = {}

const page = (props: Props) => {
  return (
    <div className='w-full h-screen p-1 flex flex-col gap-1'>
      
      <WorkFlowEditor/>
      </div>
  )
}

export default page