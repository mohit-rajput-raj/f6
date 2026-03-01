import React from 'react'
import DemoCamelCaseFlow from '../editor/_components/nodes/input-nodes/test-nodes'
import { EditorWorkFlowContextProvider } from '@/context/WorkFlowContextProvider'

type Props = {}

const Settings = (props: Props) => {
  return (
    <div> 
      <EditorWorkFlowContextProvider>
        <DemoCamelCaseFlow/>
      </EditorWorkFlowContextProvider>
      
      </div>
  )
}

export default Settings