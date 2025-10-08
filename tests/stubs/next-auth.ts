export class AuthError extends Error {
  type: string;

  constructor(type = "AuthError", message = "Auth error") {
    super(message);
    this.type = type;
  }
}
