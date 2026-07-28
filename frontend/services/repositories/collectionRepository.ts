import {
  readStorage,
  writeStorage,
} from "@/services/storage/clientStorage";

export type CollectionRepository<T> = {
  getAll: () => T[];
  saveAll: (items: T[]) => void;
  add: (item: T) => void;
};

export function createCollectionRepository<T>(
  storageKey: string,
): CollectionRepository<T> {
  function getAll(): T[] {
    return readStorage<T[]>(storageKey, []);
  }

  function saveAll(items: T[]): void {
    writeStorage(storageKey, items);
  }

  function add(item: T): void {
    saveAll([item, ...getAll()]);
  }

  return { getAll, saveAll, add };
}
