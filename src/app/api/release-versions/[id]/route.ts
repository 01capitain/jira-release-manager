import { type NextRequest, NextResponse } from "next/server";
 import { z } from "zod";
import { ReleaseVersionService } from "~/server/api/services/releaseVersion";

const releaseVersionService = new ReleaseVersionService();
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = z.string().trim().min(1).parse(params.id);
  const releaseVersion = await releaseVersionService.getOne(id);
  if (!releaseVersion) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(releaseVersion);
}

export async function DELETE(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  { params }: { params: { id: string } }
) {
  const releaseVersion = await releaseVersionService.delete(params.id);
  return NextResponse.json(releaseVersion);
}
