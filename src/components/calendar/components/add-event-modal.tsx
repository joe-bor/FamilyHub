import { parseISO } from "date-fns";
import { X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type CalendarEvent, colorMap, familyMembers } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (event: Omit<CalendarEvent, "id">) => void;
  isPending?: boolean;
}

export function AddEventModal({
  isOpen,
  onClose,
  onAdd,
  isPending = false,
}: AddEventModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedMember, setSelectedMember] = useState(familyMembers[0].id);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !startTime || !endTime || isPending) return;

    onAdd({
      title,
      // Use parseISO to correctly parse date string as local time, not UTC
      date: parseISO(date),
      startTime,
      endTime,
      memberId: selectedMember,
    });

    // Reset form (modal close is handled by parent on success)
    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setSelectedMember(familyMembers[0].id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Add Event</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event name"
              className="bg-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign To</Label>
            <div className="flex flex-wrap gap-2">
              {familyMembers.map((member) => {
                const colors = colorMap[member.color];
                const isSelected = selectedMember === member.id;

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMember(member.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all",
                      isSelected
                        ? `${colors?.bg} text-card`
                        : `${colors?.light} ${colors?.text} hover:opacity-80`,
                    )}
                  >
                    <div className={cn("w-3 h-3 rounded-full", colors?.bg)} />
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={isPending}
            >
              {isPending ? "Adding..." : "Add Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
