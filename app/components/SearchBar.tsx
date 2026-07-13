import { useState } from "react";
import type { FormEvent } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialQuery?: string;
}

export default function SearchBar({
  onSearch,
  isLoading = false,
  initialQuery = "",
}: SearchBarProps) {
  const [text, setText] = useState<string>(initialQuery);

  const submit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const q = text.trim();
    if (q.length === 0) return;
    onSearch(q);
  };

  const clear = () => {
    setText("");
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl my-4">
      <div className="flex items-center rounded-lg border border-input bg-transparent shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <span className="flex items-center pl-2.5 text-muted-foreground">
          <SearchIcon className="size-4" />
        </span>
        <Input
          type="text"
          placeholder="Search torrents by name, IMDB, or info hash..."
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          className="border-0 shadow-none rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
        />
        {text && !isLoading ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            title="Clear"
            className="mr-1"
          >
            <XIcon className="size-4" />
          </Button>
        ) : null}
        <Button
          type="submit"
          variant="default"
          size="sm"
          disabled={isLoading}
          className="mr-1 rounded-md"
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground text-center">
        Press Enter to search. You can paste an info hash to jump directly.
      </p>
    </form>
  );
}
