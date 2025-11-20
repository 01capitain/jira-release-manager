/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

describe("Dialog", () => {
  function DialogFixture() {
    const [open, setOpen] = React.useState(false);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button">Open details</button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan details</DialogTitle>
            <DialogDescription>Choose how to continue</DialogDescription>
          </DialogHeader>
          <div>Content body</div>
          <DialogClose asChild>
            <button type="button">Dismiss</button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    );
  }

  it("opens via the trigger and closes via a button interaction", async () => {
    render(<DialogFixture />);

    fireEvent.click(screen.getByRole("button", { name: "Open details" }));

    const dialog = await screen.findByRole("dialog");

    const title = screen.getByText("Plan details");
    const description = screen.getByText("Choose how to continue");
    expect(dialog.getAttribute("aria-labelledby")).toBe(title.id);
    expect(dialog.getAttribute("aria-describedby")).toBe(description.id);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("forwards refs to the underlying Radix primitives", () => {
    const contentRef = React.createRef<HTMLDivElement>();
    const handleOpenChange = jest.fn();

    render(
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent ref={contentRef}>
          <DialogTitle>Ref check</DialogTitle>
          <DialogDescription>Ensure DOM node is exposed</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(contentRef.current).toBeInstanceOf(HTMLDivElement);
  });
});
