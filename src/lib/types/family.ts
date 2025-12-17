export interface FamilyMember {
  id: string
  name: string
  color: string
  avatar?: string
}

export const familyMembers: FamilyMember[] = [
  { id: "1", name: "Mom", color: "bg-coral" },
  { id: "2", name: "Dad", color: "bg-teal" },
  { id: "3", name: "Ethan", color: "bg-green" },
  { id: "4", name: "Grandma", color: "bg-pink" },
  { id: "5", name: "Grandpa", color: "bg-purple" },
  { id: "6", name: "Family", color: "bg-yellow" },
]

export const colorMap: Record<string, { bg: string; text: string; light: string }> = {
  "bg-coral": {
    bg: "bg-[#e88470]",
    text: "text-[#8b3d32]",
    light: "bg-[#fbe9e6]",
  },
  "bg-teal": {
    bg: "bg-[#5cb8b2]",
    text: "text-[#2d6360]",
    light: "bg-[#e0f4f3]",
  },
  "bg-pink": {
    bg: "bg-[#e896b8]",
    text: "text-[#8b4660]",
    light: "bg-[#fce8f0]",
  },
  "bg-green": {
    bg: "bg-[#7bc67b]",
    text: "text-[#3d6b3d]",
    light: "bg-[#e6f5e6]",
  },
  "bg-purple": {
    bg: "bg-[#9b7bcf]",
    text: "text-[#523d70]",
    light: "bg-[#ede6f7]",
  },
  "bg-yellow": {
    bg: "bg-[#f5c842]",
    text: "text-[#7a5f10]",
    light: "bg-[#fef6dc]",
  },
  "bg-orange": {
    bg: "bg-[#f5a442]",
    text: "text-[#7a4f10]",
    light: "bg-[#fef0dc]",
  },
}
