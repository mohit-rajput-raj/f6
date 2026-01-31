import { RPCHandler } from '@orpc/server/fetch'
import { onError } from '@orpc/server'
import {router} from "@repo/orpc"

console.log('RPC route loaded, router:', router)

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error('RPC Error:', error)
    }),
  ],
})

async function handleRequest(request: Request) {
  console.log('RPC Request received:', request.method, request.url)
  
  try {
    const { response } = await handler.handle(request, {
      prefix: '/rpc',
      context: {}, // Provide initial context if needed
    })

    console.log('RPC Response:', response)
    return response ?? new Response('Not found', { status: 404 })
  } catch (error) {
    console.error('RPC Handler Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export const HEAD = handleRequest
export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const PATCH = handleRequest
export const DELETE = handleRequest