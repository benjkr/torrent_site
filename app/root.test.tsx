import { describe, test, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import Root from "./root";

function TestApp({ path }: { path: string }) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: Root,
      children: [
        { index: true, Component: () => <div>search page</div> },
        { path: "search", Component: () => <div>search page</div> },
        { path: "torrents", Component: () => <div>torrents page</div> },
      ],
    },
  ]);
  return <Stub initialEntries={[path]} />;
}

describe("App", () => {
  test("renders navbar with links", () => {
    render(<TestApp path="/search" />);
    expect(screen.getByText("Torrent Site")).toBeTruthy();
    expect(screen.getByText("Search")).toBeTruthy();
    expect(screen.getByText("Active Torrents")).toBeTruthy();
  });
});
