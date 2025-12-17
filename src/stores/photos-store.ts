import { create } from "zustand"

export interface Photo {
  id: string
  url: string
  caption?: string
  date: Date
  memberId?: string
}

interface PhotosState {
  photos: Photo[]
  addPhoto: (photo: Omit<Photo, "id">) => void
  updatePhoto: (id: string, updates: Partial<Photo>) => void
  deletePhoto: (id: string) => void
}

export const usePhotosStore = create<PhotosState>((set) => ({
  photos: [],

  addPhoto: (photoData) =>
    set((state) => ({
      photos: [...state.photos, { ...photoData, id: `photo-${Date.now()}` }],
    })),

  updatePhoto: (id, updates) =>
    set((state) => ({
      photos: state.photos.map((photo) =>
        photo.id === id ? { ...photo, ...updates } : photo
      ),
    })),

  deletePhoto: (id) =>
    set((state) => ({
      photos: state.photos.filter((photo) => photo.id !== id),
    })),
}))
