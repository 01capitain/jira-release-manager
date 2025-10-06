export class NextRequest {}

export const NextResponse = {
  json(body: unknown, init?: ResponseInit) {
    return { body, init } as unknown as Response;
  },
};
