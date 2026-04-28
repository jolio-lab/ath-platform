import { NextResponse } from "next/server";

const SUNNY_URL = "https://thousand-sunny-five.vercel.app/api/crew-feed";

// 15s cache — feed updates more often than bias.
export const revalidate = 15;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const upstream = new URL(SUNNY_URL);
  for (const [k, v] of url.searchParams) {
    upstream.searchParams.set(k, v);
  }
  try {
    const res = await fetch(upstream.toString(), { next: { revalidate: 15 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: `upstream ${res.status}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
