import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import SearchBar from "../components/SearchBar";
import SearchResultsTable from "../components/SearchResultsTable";
import type { ApiItem } from "../lib/types";
import { formatBytes } from "../lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

const PPER = 10;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const searchFetcher = useFetcher<ApiItem[]>();
  const downloadFetcher = useFetcher();

  useEffect(() => {
    if (!query) return;
    setIsLoading(true);
    searchFetcher.load(`/api/search?query=${encodeURIComponent(query)}`);
  }, [query]);

  useEffect(() => {
    if (searchFetcher.state === "idle" && searchFetcher.data) {
      const data = searchFetcher.data;
      setItems(data || []);
      setIsLoading(false);
      setPage(1);
      setTotalPages(Math.max(1, Math.ceil((data?.length || 0) / PPER)));
    }
  }, [searchFetcher.state, searchFetcher.data]);

  const handleDownload = (hash: string, name: string) => {
    downloadFetcher.load(`/api/download?hash=${hash}&name=${encodeURIComponent(name)}`);
  };

  const start = (page - 1) * PPER;
  const end = Math.min(start + PPER, items.length);
  const pageItems = items.slice(start, end);

  return (
    <div>
      <SearchBar isLoading={isLoading} onSearch={setQuery} />
      {items.length > 0 && (
        <div className="text-center mb-2 text-xs text-muted-foreground">
          Displaying {start + 1}-{end} of {items.length} torrents
        </div>
      )}
      <SearchResultsTable
        items={pageItems}
        onDownload={handleDownload}
        formatBytes={formatBytes}
      />
      {items.length > 0 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(Math.max(1, page - 1));
                }}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  href="#"
                  isActive={page === i + 1}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(i + 1);
                  }}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(Math.min(totalPages, page + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
