type NotebookCell = { cell_type?: string; source?: string | string[] };
type Notebook = { cells?: NotebookCell[] };

function cellText(cell: NotebookCell) {
  return Array.isArray(cell.source) ? cell.source.join("") : String(cell.source ?? "");
}

/** Replace a unique snippet in one notebook cell. Returns the full notebook JSON. */
export function replaceNotebookCell(raw: string, cellIndex: number, oldString: string, newString: string) {
  const nb = JSON.parse(raw) as Notebook;
  const cell = nb.cells?.[cellIndex];
  if (!cell) throw new Error("单元格不存在");
  const src = cellText(cell);
  const count = src.split(oldString).length - 1;
  if (!oldString) throw new Error("old_string 不能为空");
  if (count === 0) throw new Error("old_string 未找到");
  if (count > 1) throw new Error("old_string 不唯一");
  cell.source = src.replace(oldString, newString);
  return `${JSON.stringify(nb, null, 2)}\n`;
}
