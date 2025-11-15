/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import * as React from "react";
import { Button } from "~/components/ui/button";

describe("Button", () => {
  it("defaults native buttons to type='button'", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button.getAttribute("type")).toBe("button");
  });

  it("respects explicit type assignments", () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByRole("button", { name: "Submit" });
    expect(button.getAttribute("type")).toBe("submit");
  });

  it("does not inject a type when rendering asChild", () => {
    render(
      <Button asChild>
        <a href="/docs">Docs</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Docs" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("type")).toBeNull();
  });
});
