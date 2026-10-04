import { NextRequest, NextResponse } from "next/server";
import { verifyBlockPassword } from "@/app/[project]/dash/[dashid]/desk/desk-block-actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { blockId, password } = body;

    if (!blockId) {
      return NextResponse.json(
        { success: false, error: "blockId is required" },
        { status: 400 }
      );
    }

    const result = await verifyBlockPassword(blockId, password || "");

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message || "Invalid password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      token: result.token,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
