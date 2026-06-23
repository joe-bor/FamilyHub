import { useMemo, useState } from "react";
import {
  useCreateEvent,
  useDeleteEvent,
  useDeleteInstance,
  useFamilyMemberMap,
  useFamilyMembers,
  useFamilyName,
  useUpdateEvent,
  useUpdateInstance,
} from "@/api";
import {
  AddEventButton,
  type EditScope,
  EditScopeDialog,
  EventDetailModal,
  EventFormModal,
} from "@/components/calendar";
import { useIsMobile } from "@/hooks";
import {
  resolveFeedSelection,
  selectOpenableEvents,
} from "@/lib/home-activity/navigation";
import type { FeedRow } from "@/lib/home-activity/types";
import { buildRRule } from "@/lib/recurrence-utils";
import { format24hTo12h, formatLocalDate, getEventKey } from "@/lib/time-utils";
import {
  type CalendarEvent,
  type CreateEventRequest,
  colorMap,
} from "@/lib/types";
import type { EventFormData } from "@/lib/validations";
import {
  useAppStore,
  useCalendarActions,
  useCalendarState,
  useCalendarStore,
  useEditModalState,
  useEventDetailState,
} from "@/stores";
import { ActivityFeed } from "./components/activity-feed";
import { ComingUp } from "./components/coming-up";
import { DashboardHeader } from "./components/dashboard-header";
import { HeroCard } from "./components/hero-card";
import { MemberChipRow } from "./components/member-chip-row";
import { StateLine } from "./components/state-line";
import { TodayList } from "./components/today-list";
import { useActivityFeed } from "./hooks/use-activity-feed";
import { useDashboardEvents } from "./hooks/use-dashboard-events";
import { useDashboardNow } from "./hooks/use-hero-state";
import { useStateLine } from "./hooks/use-state-line";
import { deriveHeroState } from "./lib/hero-state";

function getParentId(event: {
  id: string | null;
  recurringEventId?: string;
}): string {
  const id = event.recurringEventId ?? event.id;
  if (!id) {
    throw new Error("Cannot resolve parent ID for recurring event operation");
  }
  return id;
}

function LoadingDashboard() {
  return (
    <div className="px-4 pt-5">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-40 rounded-full bg-muted" />
        <div className="flex gap-2">
          <div className="h-11 w-11 rounded-full bg-muted" />
          <div className="h-11 w-11 rounded-full bg-muted" />
          <div className="h-11 w-11 rounded-full bg-muted" />
        </div>
        <div className="h-48 rounded-[1.75rem] bg-card" />
        <div className="space-y-3">
          <div className="h-12 rounded-2xl bg-muted" />
          <div className="h-12 rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

function StateLineSection({ now }: { now: Date }) {
  const { choresRemaining, dinnerTitle } = useStateLine({ now });
  return (
    <StateLine choresRemaining={choresRemaining} dinnerTitle={dinnerTitle} />
  );
}

function ActivityFeedSection({
  now,
  onOpenEvent,
}: {
  now: Date;
  onOpenEvent: (e: CalendarEvent) => void;
}) {
  const { feed, meaningfulOpenId, events } = useActivityFeed({
    nowProvider: () => now.getTime(),
  });
  const memberMap = useFamilyMemberMap();
  // The feed is family-wide, so deep-links resolve against the unfiltered openable
  // set — NOT the member-filtered dashboard agenda, which would downgrade other
  // members' in-window rows to date-focus when a member is focused (M1).
  const inWindowEvents = useMemo(
    () => selectOpenableEvents(events, now),
    [events, now],
  );
  const handleSelect = (row: FeedRow) => {
    const sel = resolveFeedSelection(row, inWindowEvents);
    const store = useAppStore.getState();
    if (sel.type === "open-event") onOpenEvent(sel.event);
    else if (sel.type === "open-list") store.openListDetail(sel.listId);
    else if (sel.type === "focus-calendar") store.focusCalendarDate(sel.date);
    else store.setActiveModule(sel.module);
  };
  const memberColorOf = (id: string | undefined) => {
    const member = id ? memberMap.get(id) : undefined;
    return member ? colorMap[member.color]?.hex : undefined;
  };
  return (
    <ActivityFeed
      feed={feed}
      onSelectRow={handleSelect}
      memberColorOf={memberColorOf}
      meaningfulOpenId={meaningfulOpenId}
    />
  );
}

export function HomeDashboard({ nowOverride }: { nowOverride?: Date } = {}) {
  const isMobile = useIsMobile();
  const familyName = useFamilyName();
  const members = useFamilyMembers();
  const liveNow = useDashboardNow();
  const now = nowOverride ?? liveNow;
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(null);
  const { isAddEventModalOpen, addEventDefaults } = useCalendarState();
  const {
    openAddEventModal,
    closeAddEventModal,
    openEditModal,
    closeEditModal,
  } = useCalendarActions();
  const {
    selectedEvent,
    isDetailModalOpen,
    openDetailModal,
    closeDetailModal,
  } = useEventDetailState();
  const { editingEvent, isEditModalOpen } = useEditModalState();
  const { today, comingUp, isLoading, isError, error } = useDashboardEvents({
    currentDate: now,
    memberFocusId: focusedMemberId,
  });
  const heroState = useMemo(
    () => deriveHeroState({ todayEvents: today, now }),
    [now, today],
  );
  const heroEvent = "event" in heroState ? heroState.event : null;
  const heroEventKey = heroEvent ? getEventKey(heroEvent) : null;
  const createEvent = useCreateEvent({
    onSuccess: () => {
      closeAddEventModal();
    },
  });
  const updateEvent = useUpdateEvent({
    onSuccess: () => {
      closeEditModal();
      setEditScope(null);
    },
  });
  const updateInstance = useUpdateInstance({
    onSuccess: () => {
      closeEditModal();
      setEditScope(null);
    },
  });
  const deleteEvent = useDeleteEvent({
    onSuccess: () => {
      closeDetailModal();
      setScopeDialogOpen(false);
    },
  });
  const deleteInstance = useDeleteInstance({
    onSuccess: () => {
      closeDetailModal();
      setScopeDialogOpen(false);
    },
  });
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scopeAction, setScopeAction] = useState<"edit" | "delete">("edit");
  const [editScope, setEditScope] = useState<EditScope | null>(null);

  const openPrefilledAddModal = () => {
    openAddEventModal({
      date: formatLocalDate(now),
      memberId: focusedMemberId ?? members[0]?.id ?? "",
    });
  };

  const handleEventClick = (event: (typeof today)[number]) => {
    deleteEvent.reset();
    deleteInstance.reset();
    openDetailModal(event);
  };

  const handleAddEvent = (formData: EventFormData) => {
    const recurrenceRule =
      buildRRule({
        frequency: formData.recurrenceFrequency ?? "none",
        interval: formData.recurrenceInterval ?? 1,
        weeklyDays: formData.recurrenceWeeklyDays,
        monthDay: formData.recurrenceMonthDay,
        endDate: formData.recurrenceEndDate,
      }) ?? null;

    const request: CreateEventRequest = {
      title: formData.title,
      startTime: format24hTo12h(formData.startTime),
      endTime: format24hTo12h(formData.endTime),
      date: formData.date,
      endDate: formData.endDate ?? null,
      memberId: formData.memberId,
      isAllDay: formData.isAllDay,
      location: formData.location,
      description: formData.description,
      recurrenceRule,
    };

    createEvent.mutate(request);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;

    if (selectedEvent.source === "GOOGLE") {
      return;
    }

    if (selectedEvent.isRecurring) {
      setScopeAction("delete");
      setScopeDialogOpen(true);
      return;
    }

    if (selectedEvent.id) {
      deleteEvent.mutate(selectedEvent.id);
    }
  };

  const handleEditClick = () => {
    if (!selectedEvent || selectedEvent.source === "GOOGLE") return;

    if (selectedEvent.isRecurring) {
      setScopeAction("edit");
      setScopeDialogOpen(true);
      return;
    }

    openEditModal(selectedEvent);
  };

  const handleScopeSelect = (scope: EditScope) => {
    if (!selectedEvent) return;

    setScopeDialogOpen(false);

    if (scopeAction === "edit") {
      setEditScope(scope);
      openEditModal(selectedEvent);
      return;
    }

    const parentId = getParentId(selectedEvent);
    if (scope === "this") {
      deleteInstance.mutate({
        parentId,
        date: formatLocalDate(selectedEvent.date),
      });
      return;
    }

    deleteEvent.mutate(parentId);
  };

  const handleUpdateEvent = (formData: EventFormData) => {
    const currentEditingEvent = useCalendarStore.getState().editingEvent;
    if (!currentEditingEvent) return;

    const request = {
      title: formData.title,
      startTime: format24hTo12h(formData.startTime),
      endTime: format24hTo12h(formData.endTime),
      date: formData.date,
      endDate: formData.endDate ?? null,
      memberId: formData.memberId,
      isAllDay: formData.isAllDay,
      location: formData.location,
      description: formData.description,
    };

    if (currentEditingEvent.isRecurring && editScope === "this") {
      updateInstance.mutate({
        parentId: getParentId(currentEditingEvent),
        instanceDate: formatLocalDate(currentEditingEvent.date),
        ...request,
      });
      return;
    }

    const recurrenceRule =
      currentEditingEvent.isRecurring && editScope === "all"
        ? (buildRRule({
            frequency: formData.recurrenceFrequency ?? "none",
            interval: formData.recurrenceInterval ?? 1,
            weeklyDays: formData.recurrenceWeeklyDays,
            monthDay: formData.recurrenceMonthDay,
            endDate: formData.recurrenceEndDate,
          }) ?? null)
        : undefined;

    const id = currentEditingEvent.isRecurring
      ? getParentId(currentEditingEvent)
      : currentEditingEvent.id;

    if (!id) return;

    updateEvent.mutate({
      id,
      ...request,
      ...(recurrenceRule !== undefined && { recurrenceRule }),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto pb-[max(8.5rem,calc(env(safe-area-inset-bottom)+8.5rem))]">
      <DashboardHeader familyName={familyName} now={now} />
      <MemberChipRow
        members={members}
        focusedId={focusedMemberId}
        onFocusChange={setFocusedMemberId}
      />

      {isLoading ? (
        <LoadingDashboard />
      ) : isError ? (
        <div className="px-4 pt-6 text-sm text-destructive">
          Error loading events: {error?.message ?? "Unknown error"}
        </div>
      ) : (
        <>
          <HeroCard
            state={heroState}
            member={
              heroEvent
                ? members.find((member) => member.id === heroEvent.memberId)
                : undefined
            }
            now={now}
            onTap={heroEvent ? () => handleEventClick(heroEvent) : undefined}
          />
          {isMobile && <StateLineSection now={now} />}
          <TodayList
            currentDate={now}
            events={today}
            members={members}
            excludeKey={heroEventKey}
            onSelect={handleEventClick}
          />
          <ComingUp
            currentDate={now}
            events={comingUp}
            members={members}
            onSelect={handleEventClick}
          />
          {isMobile && (
            <ActivityFeedSection now={now} onOpenEvent={handleEventClick} />
          )}
        </>
      )}

      <AddEventButton onClick={openPrefilledAddModal} />
      <EventFormModal
        mode="add"
        isOpen={isAddEventModalOpen}
        onClose={closeAddEventModal}
        onSubmit={handleAddEvent}
        isPending={createEvent.isPending}
        defaultValues={addEventDefaults ?? undefined}
      />
      <EventFormModal
        mode="edit"
        isOpen={isEditModalOpen}
        onClose={() => {
          closeEditModal();
          setEditScope(null);
        }}
        onSubmit={handleUpdateEvent}
        isPending={updateEvent.isPending || updateInstance.isPending}
        event={editingEvent ?? undefined}
        showRecurrencePicker={editScope !== "this"}
      />
      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        onEdit={handleEditClick}
        onDelete={handleDeleteEvent}
        isDeleting={deleteEvent.isPending || deleteInstance.isPending}
        deleteError={
          deleteEvent.error?.message ?? deleteInstance.error?.message
        }
      />
      <EditScopeDialog
        isOpen={scopeDialogOpen}
        onClose={() => setScopeDialogOpen(false)}
        onSelect={handleScopeSelect}
        action={scopeAction}
      />
    </div>
  );
}
