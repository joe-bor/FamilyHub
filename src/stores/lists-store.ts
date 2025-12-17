import { create } from "zustand"

export interface ListItem {
  id: string
  text: string
  completed: boolean
}

export interface List {
  id: string
  name: string
  items: ListItem[]
}

interface ListsState {
  lists: List[]
  addList: (name: string) => void
  deleteList: (id: string) => void
  addItem: (listId: string, text: string) => void
  toggleItem: (listId: string, itemId: string) => void
  deleteItem: (listId: string, itemId: string) => void
}

export const useListsStore = create<ListsState>((set) => ({
  lists: [],

  addList: (name) =>
    set((state) => ({
      lists: [
        ...state.lists,
        { id: `list-${Date.now()}`, name, items: [] },
      ],
    })),

  deleteList: (id) =>
    set((state) => ({
      lists: state.lists.filter((list) => list.id !== id),
    })),

  addItem: (listId, text) =>
    set((state) => ({
      lists: state.lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: [
                ...list.items,
                { id: `item-${Date.now()}`, text, completed: false },
              ],
            }
          : list
      ),
    })),

  toggleItem: (listId, itemId) =>
    set((state) => ({
      lists: state.lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId
                  ? { ...item, completed: !item.completed }
                  : item
              ),
            }
          : list
      ),
    })),

  deleteItem: (listId, itemId) =>
    set((state) => ({
      lists: state.lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.filter((item) => item.id !== itemId),
            }
          : list
      ),
    })),
}))
