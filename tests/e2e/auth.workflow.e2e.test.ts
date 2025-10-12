import { AuthError } from "next-auth";

jest.mock(
  "~/server/auth",
  () => ({
    signIn: jest.fn(),
    signOut: jest.fn(),
    auth: jest.fn(),
  }),
  { virtual: true },
);

let signInMock: jest.Mock;
let signOutMock: jest.Mock;
let authMock: jest.Mock;

let loginHandler: (request: Request) => Promise<Response>;
let logoutHandler: (request: Request) => Promise<Response>;
let sessionHandler: () => Promise<Response>;

beforeAll(async () => {
  const authModule = await import("~/server/auth");
  signInMock = authModule.signIn as jest.Mock;
  signOutMock = authModule.signOut as jest.Mock;
  authMock = authModule.auth as jest.Mock;

  ({ POST: loginHandler } = await import("~/app/api/auth/login/route"));
  ({ POST: logoutHandler } = await import("~/app/api/auth/logout/route"));
  ({ GET: sessionHandler } = await import("~/app/api/auth/session/route"));
});

const jsonHeaders = {
  "Content-Type": "application/json",
};

const createJsonRequest = (url: string, body: unknown) =>
  new Request(url, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });

describe("Auth REST workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("returns redirectUrl when Discord sign-in succeeds", async () => {
      signInMock.mockResolvedValueOnce("https://discord.example/authorize");

      const request = createJsonRequest("http://test/api/auth/login", {
        provider: "discord",
      });
      const response = await loginHandler!(request);
      const payload = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(payload.redirectUrl).toBe("https://discord.example/authorize");
      expect(signInMock).toHaveBeenCalledWith("discord", {
        redirect: false,
        redirectTo: undefined,
      });
    });

    it("propagates Auth.js errors with a 500 response", async () => {
      const authError = new AuthError("CallbackRouteError");
      signInMock.mockRejectedValueOnce(authError);

      const request = createJsonRequest("http://test/api/auth/login", {
        provider: "discord",
      });
      const response = await loginHandler!(request);
      const payload = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(500);
      expect(payload.error).toBe(authError.type ?? "AUTH_ERROR");
      expect(typeof payload.message).toBe("string");
    });

    it("rejects unsupported providers with 400", async () => {
      const request = createJsonRequest("http://test/api/auth/login", {
        provider: "github",
      });
      const response = await loginHandler!(request);
      const payload = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(400);
      expect(payload.error).toBe("PROVIDER_UNAVAILABLE");
      expect(signInMock).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/logout", () => {
    it("returns 204 when logout succeeds", async () => {
      signOutMock.mockResolvedValueOnce(undefined);

      const request = new Request("http://test/api/auth/logout", {
        method: "POST",
      });
      const response = await logoutHandler!(request);

      expect(response.status).toBe(204);
      expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    });

    it("maps AuthError to 500", async () => {
      const authError = new AuthError("SessionError");
      signOutMock.mockRejectedValueOnce(authError);

      const request = new Request("http://test/api/auth/logout", {
        method: "POST",
      });
      const response = await logoutHandler!(request);
      const payload = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(500);
      expect(payload.error).toBe(authError.type ?? "AUTH_ERROR");
    });
  });

  describe("GET /api/auth/session", () => {
    it("returns session payload when user exists", async () => {
      authMock.mockResolvedValueOnce({
        user: { id: "user-123", name: "Discord User" },
        expires: "2099-01-01T00:00:00.000Z",
      });

      const response = await sessionHandler!();
      const payload = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(payload.user).toEqual({ id: "user-123", name: "Discord User" });
      expect(payload.expires).toBe("2099-01-01T00:00:00.000Z");
    });

    it("returns guest payload when no session", async () => {
      authMock.mockResolvedValueOnce(null);

      const response = await sessionHandler!();
      const payload = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(payload).toEqual({ user: null });
    });
  });
});
