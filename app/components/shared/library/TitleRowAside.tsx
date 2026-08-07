import { FreeSpacePill, useQbFreeSpace } from "@/components/shared/FreeSpacePill";

export function TitleRowAside() {
  const free = useQbFreeSpace();
  if (!free) return null;
  return <FreeSpacePill data={free} className="self-start @sm:self-auto" />;
}
