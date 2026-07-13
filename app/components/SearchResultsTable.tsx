import { DownloadIcon, ClockIcon, FilesIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiItem } from "../lib/types";

interface Props {
  items: ApiItem[];
  onDownload: (hash: string, name: string) => void;
  formatBytes: (bytes: number) => string;
}

export default function SearchResultsTable({
  items,
  onDownload,
  formatBytes,
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-80">Name</TableHead>
          <TableHead>Added</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Files</TableHead>
          <TableHead>Seeds/Leech</TableHead>
          <TableHead>Hash</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const added = formatDistanceToNow(new Date(+item.added * 1000), {
            addSuffix: true,
          });
          const size = formatBytes(+item.size);
          return (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-semibold">{item.name}</div>
                <div className="text-muted-foreground">{item.imdb}</div>
              </TableCell>
              <TableCell>
                <ClockIcon className="inline size-3 mr-1" />
                {added}
              </TableCell>
              <TableCell>
                {size}
                {+item.num_files > 1
                  ? ` (${formatBytes(+item.size / +item.num_files)} / file)`
                  : ""}
              </TableCell>
              <TableCell>
                <FilesIcon className="inline size-3 mr-1" />
                {item.num_files}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="mr-1.5 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">
                  {item.seeders}
                </Badge>
                <Badge variant="secondary" className="bg-red-500/15 text-red-600 hover:bg-red-500/20">
                  {item.leechers}
                </Badge>
              </TableCell>
              <TableCell className="font-mono">{item.info_hash}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  onClick={() => onDownload(item.info_hash, item.name)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <DownloadIcon className="size-3.5" />
                  Download
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
