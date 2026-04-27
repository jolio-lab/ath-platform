import { NextResponse } from "next/server";

const SUNNY_PLAYBOOK_URL = "https://thousand-sunny-five.vercel.app/api/playbook";

// Proxy the live Sunny playbook so the landing page can show real captain status
// without exposing CORS issues. Cached for 30s at the edge.
export const revalidate = 30;

export async function GET() {
  try {
    const res = await fetch(SUNNY_PLAYBOOK_URL, {
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `upstream ${res.status}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
