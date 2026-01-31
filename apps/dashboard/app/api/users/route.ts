import { NextRequest, NextResponse } from 'next/server'

// Mock data for now - replace with actual database call when connection is fixed
const mockUsers = [
  { id: 1, name: "John Doe", email: "john@example.com" },
  { id: 2, name: "Jane Smith", email: "jane@example.com" }
];

export async function GET(request: NextRequest) {
  return NextResponse.json({
    users: mockUsers
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({
    users: mockUsers,
    received: body
  })
}
