export interface CatalogNode {
  recycleItemId?: number;
  parentId: number;
  sort: number;
}

/** 只整理显示关系；缺失父级或循环引用的节点提升到根部，避免错误数据被隐藏。 */
export function buildCatalogTree<T extends CatalogNode>(rows: T[]) {
  type Node = T & { children: Node[] };
  const nodes: Node[] = rows.map((row) => ({ ...row, children: [] }));
  const byId = new Map(nodes.map((node) => [node.recycleItemId, node]));
  const roots: Node[] = [];
  for (const node of nodes) {
    let parent = byId.get(node.parentId);
    const visited = new Set([node.recycleItemId]);
    let ancestor = parent;
    while (ancestor) {
      if (visited.has(ancestor.recycleItemId)) { parent = undefined; break; }
      visited.add(ancestor.recycleItemId);
      ancestor = byId.get(ancestor.parentId);
    }
    if (node.parentId !== 0 && parent) parent.children.push(node);
    else roots.push(node);
  }
  function sort(items: Node[]) {
    items.sort((a, b) => a.sort - b.sort || (a.recycleItemId ?? 0) - (b.recycleItemId ?? 0));
    items.forEach((item) => sort(item.children));
  }
  sort(roots);
  return roots;
}
