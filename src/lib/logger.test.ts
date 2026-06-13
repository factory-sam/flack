import pino from "pino";
import { describe, expect, it } from "vitest";
import { requestLogger } from "./logger";

describe("logger", () => {
  it("redacts sensitive fields using the configured redaction paths", () => {
    const lines: string[] = [];
    const probe = pino(
      { redact: { paths: ["token", "email", "password"], censor: "[redacted]" } },
      {
        write(chunk: string) {
          lines.push(chunk);
        }
      }
    );

    probe.info({ token: "secret-token", email: "user@example.com", password: "hunter2", keep: "ok" }, "auth");

    const record = JSON.parse(lines[0]);
    expect(record.token).toBe("[redacted]");
    expect(record.email).toBe("[redacted]");
    expect(record.password).toBe("[redacted]");
    expect(record.keep).toBe("ok");
  });

  it("creates a child logger carrying scope and context bindings", () => {
    const child = requestLogger("auth.callback", { hasCode: true });
    expect(child.bindings().scope).toBe("auth.callback");
    expect(child.bindings().hasCode).toBe(true);
    expect(child.bindings().service).toBe("flack");
  });
});
