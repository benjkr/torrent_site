export type FileTreeFile = {
  type: "file";
  name: string;
  size: number;
  progress: number;
};

export type FileTreeDir = {
  type: "dir";
  name: string;
  children: FileTreeNode[];
};

export type FileTreeNode = FileTreeDir | FileTreeFile;

type PathFile = {
  name: string;
  size: number;
  progress: number;
};

/** Build a sorted folder tree from flat `path/to/file` entries. */
export function buildFileTree(files: PathFile[]): FileTreeNode[] {
  type MutableDir = {
    type: "dir";
    name: string;
    children: Map<string, MutableDir | FileTreeFile>;
  };

  const root: MutableDir = {
    type: "dir",
    name: "",
    children: new Map(),
  };

  for (const file of files) {
    const parts = file.name.split(/[/\\]/).filter(Boolean);
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLeaf = i === parts.length - 1;
      if (isLeaf) {
        cursor.children.set(part, {
          type: "file",
          name: part,
          size: file.size,
          progress: file.progress,
        });
      } else {
        let next = cursor.children.get(part);
        if (!next || next.type !== "dir") {
          next = { type: "dir", name: part, children: new Map() };
          cursor.children.set(part, next);
        }
        cursor = next;
      }
    }
  }

  function freeze(dir: MutableDir): FileTreeNode[] {
    return [...dir.children.values()]
      .map((n) =>
        n.type === "dir"
          ? ({
              type: "dir",
              name: n.name,
              children: freeze(n),
            } satisfies FileTreeDir)
          : n,
      )
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  return freeze(root);
}
