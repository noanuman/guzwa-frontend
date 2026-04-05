import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const id = formData.get("id") as string | null;
  const type = formData.get("type") as string | null; // "reports" or "parking"

  if (!file || !id || !type) {
    return NextResponse.json({ error: "file, id, and type required" }, { status: 400 });
  }

  if (type !== "reports" && type !== "parking") {
    return NextResponse.json({ error: "type must be reports or parking" }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "public", "images", type);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const dest = path.join(dir, `${id}.png`);
  await writeFile(dest, buffer);

  return NextResponse.json({ path: `/images/${type}/${id}.png` });
}
