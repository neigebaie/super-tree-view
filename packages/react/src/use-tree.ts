import {
  createTree,
  type DefaultItem,
  type TreeInstance,
  type TreeOptions,
} from "@super-tree-view/core";
import { useState, useSyncExternalStore } from "react";

/** Re-renders the calling component when the tree state changes. */
export function useTreeSubscription<T>(tree: TreeInstance<T>): void {
  useSyncExternalStore(tree.subscribe, tree.getVersion, tree.getVersion);
}

/**
 * Creates a headless tree instance. Options are applied on every render; `default*` options
 * are only read on the first one.
 */
export function useTree<T = DefaultItem>(options: TreeOptions<T>): TreeInstance<T> {
  const [tree] = useState(() => createTree(options));
  tree.setOptions(options);
  useTreeSubscription(tree);
  return tree;
}
