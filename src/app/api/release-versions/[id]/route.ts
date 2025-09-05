import { type NextRequest, NextResponse } from "next/server";
import { ReleaseVersionService } from "~/server/api/services/releaseVersion";

const releaseVersionService = new ReleaseVersionService();

export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  { params }: { params: { id: string } }
) {
  const releaseVersion = await releaseVersionService.getOne(params.id);
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
