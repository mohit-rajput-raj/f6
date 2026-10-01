import { NextRequest, NextResponse } from "next/server";

const getPythonBaseUrl = () => {
  return (
    process.env.BACKEND_PYTHON_URL ||
    process.env.PYP_SERVER_URL ||
    "http://localhost:8000"
  ).replace(/\/+$/, "");
};

async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const subpath = Array.isArray(path) ? path.join("/") : "";
  const search = request.nextUrl.search || "";
  const targetUrl = `${getPythonBaseUrl()}/${subpath}${search}`;

  try {
    const contentType = request.headers.get("content-type") || "";
    let body: any = null;

    if (request.method !== "GET" && request.method !== "HEAD") {
      if (contentType.includes("application/json")) {
        try {
          const jsonBody = await request.json();
          // Provide server GEMINI_API_KEY fallback if user has not provided an API key
          if (
            jsonBody &&
            typeof jsonBody === "object" &&
            !jsonBody.api_key &&
            process.env.GEMINI_API_KEY
          ) {
            jsonBody.api_key = process.env.GEMINI_API_KEY;
          }
          body = JSON.stringify(jsonBody);
        } catch {
          body = null;
        }
      } else if (
        contentType.includes("multipart/form-data") ||
        contentType.includes("application/x-www-form-urlencoded")
      ) {
        body = await request.formData();
      } else {
        body = await request.arrayBuffer();
      }
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((val, key) => {
      // Avoid forwarding host or content-length which may mismatch
      const lower = key.toLowerCase();
      if (
        lower !== "host" &&
        lower !== "content-length" &&
        lower !== "connection"
      ) {
        headers[key] = val;
      }
    });

    if (contentType.includes("application/json")) {
      headers["content-type"] = "application/json";
    }

    // Abort controller with 2-minute timeout for LLM inferences
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const responseContentType = response.headers.get("content-type") || "";
    if (responseContentType.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data, {
        status: response.status,
        statusText: response.statusText,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "content-type": responseContentType || "application/octet-stream",
      },
    });
  } catch (err: any) {
    console.error(`[pyp-proxy] Error proxying to ${targetUrl}:`, err?.message || err);

    const isTimeout =
      err?.name === "AbortError" ||
      err?.code === 20 ||
      err?.message?.includes("aborted");

    return NextResponse.json(
      {
        success: false,
        detail: isTimeout
          ? "Python AI alignment engine timed out after 120s. Please try again or check the dataset size."
          : `Python AI backend is unreachable (${getPythonBaseUrl()}). Please verify that the python server (pyp) is running on port 8000.`,
        error: err?.message || String(err),
      },
      { status: isTimeout ? 504 : 503 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
