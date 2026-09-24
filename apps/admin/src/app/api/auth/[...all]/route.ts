import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Admin authentication is handled via native session actions.",
  });
}

export function POST() {
  return NextResponse.json({
    status: "ok",
    message: "Admin authentication is handled via native session actions.",
  });
}
