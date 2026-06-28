"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox() {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);

  function go() {
    const q = (ref.current?.value || "").trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    else router.push(`/search`);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      style={{ flex: 1, minWidth: 220, display: "flex", gap: "0.5rem" }}
    >
      <input
        ref={ref}
        type="text"
        name="q"
        aria-label="Search"
        placeholder="Search"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            go();
          }
        }}
        style={{ flex: 1, padding: "0.5rem", border: "1px solid #bbb", borderRadius: 6 }}
      />
      <button type="submit" aria-label="Submit search">
        Go
      </button>
    </form>
  );
}
