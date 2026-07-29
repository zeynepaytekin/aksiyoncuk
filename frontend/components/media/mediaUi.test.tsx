import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ImageFilePicker from "./ImageFilePicker";
import MediaGallery from "./MediaGallery";

describe("media UI", () => {
  it("labels the native input and revokes previews on replacement and unmount", () => {
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const first = new File(["a"], "first.png", { type: "image/png" });
    const second = new File(["b"], "second.png", { type: "image/png" });
    const { rerender, unmount } = render(
      <ImageFilePicker purpose="avatar" files={[first]} onChange={() => undefined} />,
    );
    expect(screen.getByLabelText("Choose image")).toHaveAttribute("type", "file");
    expect(screen.getByAltText("Selected image 1")).toHaveAttribute("src", "blob:first");
    rerender(<ImageFilePicker purpose="avatar" files={[second]} onChange={() => undefined} />);
    expect(revoke).toHaveBeenCalledWith("blob:first");
    unmount();
    expect(revoke).toHaveBeenCalledWith("blob:second");
    create.mockRestore(); revoke.mockRestore();
  });

  it("supports keyboard-accessible selection and reports a fifth-image limit", () => {
    const change = vi.fn();
    render(<ImageFilePicker purpose="post" maximum={4}
      files={[1, 2, 3, 4].map((value) => new File([String(value)], `${value}.png`, { type: "image/png" }))}
      onChange={change} />);
    const input = screen.getByLabelText("Choose images");
    fireEvent.change(input, { target: { files: [new File(["5"], "5.png", { type: "image/png" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("up to 4 images");
    expect(change).not.toHaveBeenCalled();
  });

  it("renders media in display order with descriptive alt text", () => {
    render(<MediaGallery alt="A post" media={[
      { id: "b", url: "/b", contentType: "image/png", width: null, height: null, displayOrder: 1 },
      { id: "a", url: "/a", contentType: "image/png", width: null, height: null, displayOrder: 0 },
    ]} />);
    expect(screen.getAllByRole("img").map((item) => item.getAttribute("src"))).toEqual(["/a", "/b"]);
    expect(screen.getByAltText("A post, image 1")).toBeInTheDocument();
  });
});
