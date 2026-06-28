import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function handle(request: Request) {
  cookies().set("session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return NextResponse.redirect(new URL("/", request.url));
}

export const GET = handle;
export const POST = handle;
