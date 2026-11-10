import { describe, it, expect } from "vitest";
import { isAuthorized } from "./basicAuth";


const header = (user: string, pass: string) => "Basic " + btoa(`${user}:${pass}`);

describe("isAuthorized", () => {
  it("accepts the right password with any username", () => {
    expect(isAuthorized(header("judge", "s3cret"), "s3cret")).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(isAuthorized(header("judge", "nope"), "s3cret")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isAuthorized(null, "s3cret")).toBe(false);
  });

  it("rejects a header that isn't Basic auth", () => {
    expect(isAuthorized("Bearer abc", "s3cret")).toBe(false);
  });

  it("rejects garbage instead of crashing", () => {
    expect(isAuthorized("Basic %%%not-base64%%%", "s3cret")).toBe(false);
  });

  it("allows passwords that contain a colon", () => {
    expect(isAuthorized(header("judge", "a:b:c"), "a:b:c")).toBe(true);
  });
});