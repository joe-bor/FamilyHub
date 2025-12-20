## FamilyHub

**Document Version:** 1.4
**Last Updated:** December 16, 2024
**Project Owner:** Joe
**Document Status:** Living Document - Phase 1B In Progress (Sprint 4 Complete)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Success Metrics](#goals--success-metrics)
4. [User Personas](#user-personas)
5. [User Stories](#user-stories)
6. [Product Scope](#product-scope)
7. [Feature Requirements](#feature-requirements)
8. [Technical Architecture](#technical-architecture)
9. [User Interface & Design](#user-interface--design)
10. [Integration Requirements](#integration-requirements)
11. [Non-Functional Requirements](#non-functional-requirements)
12. [Development Phases](#development-phases)
13. [Open Questions & Risks](#open-questions--risks)
14. [Success Criteria](#success-criteria)
15. [Appendix](#appendix)

---

## 1. Executive Summary

### Product Overview

**FamilyHub** is a custom-built, family-friendly touchscreen calendar application designed to replace expensive commercial solutions (like Skylight Calendar) while providing a centralized hub for family scheduling, task management, meal planning, and visual organization. The system will run on a dedicated 20"+ touchscreen display powered by a mini PC, with full mobile access via Progressive Web App (PWA) architecture.

### Value Proposition

- **Cost Savings:** DIY solution (~$540) vs commercial products ($350+ with subscription fees)
- **Customization:** Tailored features for family needs without unnecessary bloat
- **Learning Opportunity:** Real-world software engineering project demonstrating full-stack development, cloud deployment, and user-centered design
- **No Subscription Fees:** One-time hardware investment with self-hosted software
- **Portfolio-Quality Work:** Professional-grade project showcasing skills for job applications

### Target Users

- Primary: Parents managing household logistics and children's schedules
- Secondary: 4-year-old child learning routines and developing independence
- Context: Busy households juggling work, school, extracurriculars, and family time

---

## 2. Problem Statement

### Current Pain Points

**For Parents:**

- Mental load of remembering multiple schedules, appointments, and tasks
- Lack of shared visibility into family activities
- Constant "What's happening today?" questions
- Manual coordination between different calendar systems
- Expensive commercial solutions with limited customization

**For Children:**

- Difficulty understanding daily routines and expectations
- Over-reliance on parents for schedule information
- Limited ownership of personal responsibilities

**Technical Motivation:**

- Opportunity to build production-grade software showcasing full-stack capabilities
- Hands-on experience with modern web technologies and cloud deployment
- Portfolio project demonstrating system design and user experience skills

### Why This Solution?

1. **Centralized Information Hub:** Single source of truth visible to entire family
2. **Always-On Display:** No need to open apps or check phones
3. **Touch-Friendly for All Ages:** Designed for adult efficiency and child accessibility
4. **Multi-Device Access:** PWA architecture enables phone/tablet access when away from home
5. **Learning Platform:** Foundation for adding features (meal planning, chore tracking) as family needs evolve

---

## 3. Goals & Success Metrics

### Primary Goals

1. **Reduce Coordination Overhead:** Decrease "What's happening today?" questions by 80%
2. **Increase Schedule Visibility:** 100% of family activities visible in one location
3. **Enable Child Independence:** 4-year-old can check their own schedule without asking
4. **Portfolio Development:** Create interview-worthy project demonstrating full-stack skills
5. **Cost-Effective Solution:** Build for <$600 vs $350-500+ commercial alternatives

### Success Metrics

**Usage Metrics:**

- Daily active interactions with touchscreen (target: 10+ per day)
- Mobile app opens when away from home (target: 3+ per day)
- Events created/modified per week (target: 15+)
- Tasks completed via interface (target: 20+ per week)

**Outcome Metrics:**

- Time spent coordinating schedules (target: reduce by 50%)
- Missed appointments/activities (target: zero)
- Family satisfaction with system (target: 8/10 rating)
- Child engagement with daily routine (target: independent schedule checks)

**Technical Metrics:**

- Page load time <2 seconds
- Touch response time <100ms
- 99%+ uptime (Digital Ocean server)
- Google Calendar sync latency <5 minutes

**Portfolio Metrics:**

- Production-deployed application with public URL
- Clean, well-documented codebase on GitHub
- Professional UI/UX suitable for portfolio showcase
- Demonstrates: React, Spring Boot, REST APIs, cloud deployment, responsive design

---

## 4. User Personas

### Persona 1: Joe (Primary User - Parent)

**Role:** Working parent, software engineer transitioning careers  
**Age:** 30s  
**Tech Savvy:** High

**Goals:**

- Reduce mental load of schedule management
- Have instant visibility into family activities
- Manage work/life calendar integration
- Build impressive portfolio project for job applications

**Frustrations:**

- Constantly checking phone for schedule details
- Partner asking "What's on the calendar?"
- Commercial calendar solutions too expensive/limited
- Missing opportunities to demonstrate technical skills

**Usage Context:**

- Checks calendar multiple times daily (morning, evening, planning)
- Adds events from mobile app when away from home
- Manages both personal and child activities
- Primary technical administrator of system

**Technical Comfort:** Comfortable with APIs, configuration, troubleshooting

---

### Persona 2: Partner (Secondary User - Parent)

**Role:** Working parent  
**Age:** 30s  
**Tech Savvy:** Medium

**Goals:**

- Quick glance at daily schedule without opening apps
- Add/modify events easily from touchscreen or phone
- Know child's activities without asking
- Coordinate household responsibilities

**Frustrations:**

- Phone calendar apps require too many taps
- Uncertainty about what's already scheduled
- Duplicate communication about plans

**Usage Context:**

- Glances at calendar while preparing breakfast/dinner
- Adds appointments as they're scheduled (doctor, playdates)
- Checks schedule before committing to new activities
- Prefers touchscreen over mobile for quick checks

**Technical Comfort:** Comfortable with smartphone apps, prefers simple interfaces

---

### Persona 3: Child (Tertiary User - 4-year-old)

**Role:** Preschooler/TK student  
**Age:** 4  
**Tech Savvy:** Low (developing)

**Goals:**

- Understand daily routine independently
- Know "what's happening today"
- Complete daily tasks (brush teeth, get dressed)
- See upcoming fun activities

**Frustrations:**

- Difficulty understanding time concepts
- Constant questions about schedule
- Reliance on parents for information
- Boredom with static schedules

**Usage Context:**

- Checks calendar in morning (with parent guidance initially)
- Taps own color-coded events to see details
- Completes visual checklists (tasks with emojis)
- Looks for familiar activities (school, sports, playdates)

**Technical Comfort:** Can navigate touchscreens, recognizes colors/icons, learning to read

**Accessibility Needs:**

- Large touch targets (min 60px x 60px)
- Color-based organization (doesn't rely solely on reading)
- Visual feedback for interactions
- Simple, uncluttered interface

---

## 5. User Stories

### High Priority (MVP - Must Have)

**Calendar Viewing**

- As a **parent**, I want to see the current week's schedule at a glance, so I can plan my day efficiently
- As a **parent**, I want to toggle between day/week/month views, so I can see different time horizons
- As a **parent**, I want to filter events by family member, so I can focus on specific schedules
- As a **child**, I want to see my own color-coded events, so I know what I'm doing today

**Event Management**

- As a **parent**, I want to add new events directly from the touchscreen, so I don't need to use my phone
- As a **parent**, I want to edit existing event details (time, location, notes), so I can keep information accurate
- As a **parent**, I want to delete events when plans change, so the calendar stays current
- As a **parent**, I want events to sync with Google Calendar, so my phone calendar stays updated

**Multi-Person Event Handling**

- As a **parent**, I want to assign events to multiple family members, so family activities show for everyone
- As a **parent**, I want multi-person events to display combined colors, so I can identify shared activities
- As a **parent**, I want to see which family members are associated with each event, so coordination is clear

**Task Management**

- As a **parent**, I want to create tasks/todos with due dates, so important items don't get forgotten
- As a **parent**, I want to assign tasks to specific family members, so responsibilities are clear
- As a **child**, I want to check off completed tasks, so I feel accomplished
- As a **parent**, I want to see incomplete tasks highlighted, so nothing falls through the cracks

**Mobile Access**

- As a **parent**, I want to access the calendar from my phone, so I can add events when away from home
- As a **parent**, I want changes made on mobile to appear on the touchscreen immediately, so everyone sees updates
- As a **parent**, I want the mobile interface to work like a PWA, so it feels like a native app

**Profile & Filtering**

- As a **parent**, I want each family member to have a unique color, so events are easy to distinguish visually
- As a **parent**, I want to show/hide specific family members' events, so I can reduce visual clutter when needed
- As a **child**, I want to easily identify "my color" on the calendar, so I know which events are mine

---

### Medium Priority (Post-MVP - Nice to Have)

**Enhanced Task Features**

- As a **parent**, I want to categorize tasks (home, school, errands), so I can organize by context
- As a **parent**, I want recurring tasks (daily chores), so I don't recreate them weekly
- As a **child**, I want visual/emoji-based tasks, so I can understand them without reading

**Weather Integration**

- As a **parent**, I want to see today's weather forecast, so I can plan activities and clothing appropriately
- As a **parent**, I want weather displayed prominently on the calendar view, so it's always visible

**Enhanced Event Features**

- As a **parent**, I want to add location details to events with map integration, so navigation is easier
- As a **parent**, I want to set reminders/alerts for important events, so nothing is missed
- As a **parent**, I want to add notes/details to events, so context is preserved

---

### Low Priority (Future Enhancements)

**Photo Screensaver**

- As a **parent**, I want the display to show family photos when idle, so the device is always useful
- As a **family**, I want photos to rotate every 30 seconds, so we see variety
- As a **parent**, I want the screensaver to activate after 30 minutes of inactivity, so we balance utility and energy

**Advanced Features**

- As a **parent**, I want meal planning capabilities, so dinner prep is coordinated with schedules
- As a **parent**, I want grocery list integration, so shopping is streamlined
- As a **parent**, I want notification settings (alerts before events), so we're reminded appropriately
- As a **child**, I want fun animations when completing tasks, so engagement stays high

**Admin Features**

- As a **technical admin**, I want usage analytics (most-used features), so I can prioritize improvements
- As a **technical admin**, I want error logging and monitoring, so I can fix issues proactively

---

## 6. Product Scope

### Product Architecture

FamilyHub is designed as a **modular dashboard** with distinct sections/modules:

1. **Calendar** (MVP Focus) - Family scheduling and events
2. **Lists** (Future Module) - Grocery lists, to-do lists, etc.
3. **Chores** (Future Module) - Task management and assignments
4. **Meals** (Future Module) - Meal planning and recipes
5. **Photos** (Future Module) - Family photo gallery

**MVP Strategy:** Build and complete the Calendar module first, then expand to other modules iteratively. This allows focus on core functionality before adding additional features.

### In Scope (MVP - Phase 1)

```
**Dashboard Navigation:**
✅ Modular navigation structure (5 tabs: Calendar, Lists, Chores, Meals, Photos)
✅ Vertical tab bar with icons
✅ Touch-optimized navigation
✅ Active module highlighting

**Calendar Module (MVP Focus):**
✅ Four view types: Day, Week, Month, Schedule (agenda list)
✅ Google Calendar integration (read/write via API)
✅ Add/Edit/Delete events from touchscreen
✅ Color-coded events per family member (6 profiles)
✅ Profile-based filtering (show/hide specific people)
✅ Multi-person event support with combined colors
✅ Event details display (time, title, location)
✅ Current time indicator in day/week views
✅ Today button for quick navigation
✅ Week/month navigation (prev/next)
✅ Touch-optimized calendar grid
✅ Event modal with form validation

**Multi-Device Access:**
✅ Progressive Web App (PWA) architecture
✅ Mobile-responsive design
✅ Real-time sync between devices (via backend WebSocket)
✅ Installable on home screen (iOS/Android)

**Technical Infrastructure:**
✅ React frontend (PWA)
⏳ Spring Boot backend (REST API) - Phase 2
⏳ Google Calendar API integration - Phase 2
⏳ PostgreSQL database - Phase 2
⏳ Digital Ocean hosting - Phase 2
✅ HTTPS/SSL for secure access
```

---

### Prototype UI Exists (Deferred to Future Phases)

These modules have **frontend UI prototypes** but are **not in MVP scope**:

```markdown
**Lists Module (Prototype Only - Phase 3):**
📋 UI Prototype: Multiple list types (Grocery, To-Do, Gift Ideas, Vacation)
📋 UI Prototype: List item creation and completion
📋 UI Prototype: List navigation and detail views
❌ Backend: Not implemented (deferred to Phase 3)
❌ Scope: Excluded from MVP
**Status:** UI exists for dashboard navigation, full implementation deferred

**Chores Module (Prototype Only - Phase 3):**
📋 UI Prototype: Task list view grouped by family member
📋 UI Prototype: Task creation and completion
📋 UI Prototype: Chore assignment and due dates
❌ Backend: Not implemented (deferred to Phase 3)
❌ Scope: Excluded from MVP
**Status:** UI exists for dashboard navigation, full implementation deferred

**Meals Module (Prototype Only - Phase 3):**
📋 UI Prototype: Weekly meal planner UI
📋 UI Prototype: Breakfast/Lunch/Dinner display per day
📋 UI Prototype: Day navigation and selection
❌ Backend: Not implemented (deferred to Phase 3)
❌ Scope: Excluded from MVP
**Status:** UI exists for dashboard navigation, full implementation deferred

**Photos Module (Prototype Only - Phase 3):**
📋 UI Prototype: Photo grid display
📋 UI Prototype: Lightbox viewer with navigation
📋 UI Prototype: Upload button UI
❌ Backend: Not implemented (deferred to Phase 3)
❌ Scope: Excluded from MVP
**Status:** UI exists for dashboard navigation, full implementation deferred
```

---

### Out of Scope (Not in MVP)

**Modules (Deferred to Phase 3):**
- ❌ Chores/Task Management - Prototype UI exists, backend deferred to Phase 3
- ❌ Meal Planning - Prototype UI exists, backend deferred to Phase 3
- ❌ Lists (Grocery/To-Do) - Prototype UI exists, backend deferred to Phase 3
- ❌ Photos Gallery - Prototype UI exists, backend deferred to Phase 3

**Features (Future Enhancements):**
- ❌ Weather Widgets - Future enhancement
- ❌ Notifications/Alerts - Future enhancement
- ❌ Photo Screensaver Mode - Future enhancement
- ❌ User Authentication - Single-family use (no login for MVP)
- ❌ Third-party Calendar Integrations (Apple, Outlook) - Google Calendar only
- ❌ Recurring Event Templates - Create manually for MVP
- ❌ Advanced Task Categories - Future enhancement
- ❌ Location/Map Integration - Future enhancement
- ❌ Voice Control - Future enhancement
- ❌ Offline Mode - Requires active internet connection

---

## 7. Feature Requirements

### 7.1 Calendar Display & Navigation

#### Feature 7.1.1: Multi-View Calendar Display

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want to switch between day/week/month views so I can see different time horizons

**Requirements:**

- Display current date prominently at top of interface
- Week View (Default):
  - Show 7 days (Monday-Sunday)
  - Time slots from 6am-10pm in 1-hour increments
  - Events displayed as blocks within time slots
  - Grid layout with dates across top, times down left side
- Month View:
  - Calendar grid showing full month
  - Events displayed as colored dots or small badges per day
  - Tap day to see day detail view
- Day View:
  - Single day schedule (6am-10pm)
  - Larger event blocks with more detail visible
  - Easier for child to understand

**Acceptance Criteria:**

- [ ] View toggle buttons clearly visible (Week/Month/Day)
- [ ] Current view highlighted/active state shown
- [ ] View switches render in <500ms
- [ ] Current day highlighted in all views
- [ ] Events render correctly in each view without overlap issues
- [ ] Touch targets for view switching minimum 50px x 50px

---

#### Feature 7.1.2: Profile-Based Filtering

**Priority:** P0 (Must Have)
**User Story:** As a parent, I want to filter events by family member so I can focus on specific schedules

**Requirements:**

- "Filter" button in top navigation bar
- Clicking opens profile selection overlay
- Six default family member profiles with checkboxes:
  - Mom - Color Coral
  - Dad - Color Teal
  - Ethan - Color Green
  - Grandma - Color Pink
  - Grandpa - Color Purple
  - Family - Color Yellow
- Each profile shows:
  - Name
  - Color indicator
  - Checkbox (on/off toggle)
  - Event count for current view (e.g., "12 events")
- Filter state persists across view changes
- "Select All" / "Clear All" quick actions

**Filtering Behavior:**

- All profiles checked (default): Show all events
- One profile checked: Show only that person's events
- Multiple profiles checked: Show events for selected profiles only
- Zero profiles checked: Show message "Select at least one profile to view events"
- Multi-person events visible if ANY assigned person is selected

**Acceptance Criteria:**

- [ ] Filter button always visible in top nav
- [ ] Profile overlay slides in from right (or modal)
- [ ] Checkboxes respond immediately (<100ms)
- [ ] Calendar updates in real-time as filters toggle
- [ ] Filter state saved in localStorage (persists on reload)
- [ ] Visual feedback shows which filters are active
- [ ] Works in all calendar views (day/week/month)

---

#### Feature 7.1.3: Color-Coded Events

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want each family member to have a unique color so events are easy to distinguish visually

**Requirements:**

- Predefined color palette (OKLch color space):
  - Mom: Coral (oklch(0.72 0.15 25))
  - Dad: Teal (oklch(0.65 0.12 195))
  - Ethan: Green (oklch(0.68 0.15 145))
  - Grandma: Pink (oklch(0.72 0.15 345))
  - Grandpa: Purple (oklch(0.62 0.18 285))
  - Family: Yellow (oklch(0.80 0.15 95))
- Single-person events:
  - Event block filled with person's color
  - Text contrast-optimized for readability
- Multi-person events:
  - Event block shows **all assigned colors**
  - Gradient OR striped pattern with all colors
  - Example: Event for Parent 1 + Child shows Blue + Yellow stripes
- Color consistency:
  - Same event shows same colors across all views
  - Same colors in mobile and touchscreen interfaces

**Acceptance Criteria:**

- [ ] Events visually distinct by color in all views
- [ ] Multi-person events clearly show multiple colors (not just first person)
- [ ] Text remains readable on all color backgrounds (WCAG AA contrast)
- [ ] 4-year-old can identify "their color" on calendar
- [ ] Colors configurable in settings (future: allow custom colors)

---

### 7.2 Event Management

#### Feature 7.2.1: Add New Event

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want to add new events directly from the touchscreen so I don't need to use my phone

**Requirements:**

**Trigger Actions:**

- Tap empty time slot in calendar → Opens "New Event" modal
- Tap "+" button in top nav → Opens "New Event" modal with current time pre-filled

**New Event Form Fields:**

1. **Event Title** (required)
   - Text input, max 100 characters
   - Placeholder: "Event name"
2. **Date & Time** (required)
   - Date picker (default: selected date or today)
   - Start time picker (default: selected time slot or current hour)
   - End time picker (default: start time + 1 hour)
   - All-day event toggle
3. **Assign To** (required)
   - Checkboxes for each profile
   - Must select at least one person
   - Default: Currently filtered profiles (if only one selected)
4. **Location** (optional)
   - Text input, max 200 characters
   - Placeholder: "Where?"
5. **Notes** (optional)
   - Text area, max 500 characters
   - Placeholder: "Additional details"

**Actions:**

- "Save" button → Creates event in Google Calendar + local cache
- "Cancel" button → Discards changes, closes modal
- Tap outside modal → Same as cancel (confirm if any fields filled)

**Acceptance Criteria:**

- [ ] Modal opens in <300ms
- [ ] Date/time pickers are touch-friendly (large tap targets)
- [ ] Validation prevents saving without title and assignee
- [ ] Error messages clear and actionable
- [ ] Event appears on calendar immediately after saving
- [ ] Event syncs to Google Calendar within 30 seconds
- [ ] Keyboard appears automatically for title field (mobile)

---

#### Feature 7.2.2: Edit Existing Event

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want to edit existing event details so I can keep information accurate

**Requirements:**

**Trigger:**

- Tap existing event block → Opens event detail view
- "Edit" button in detail view → Opens edit modal

**Edit Modal:**

- Same form as "Add New Event" but pre-filled with existing data
- Additional field: "Delete Event" button (red, bottom of form)
- Save changes → Updates event in Google Calendar + local cache
- Cancel → Discards changes without saving

**Conflict Handling:**

- If event modified in Google Calendar externally, show "Newer version exists" warning
- Option: "Keep changes" or "Discard and reload"

**Acceptance Criteria:**

- [ ] Edit modal pre-fills all existing data correctly
- [ ] Changes save within 2 seconds
- [ ] Updated event re-renders immediately on calendar
- [ ] Google Calendar sync within 30 seconds
- [ ] Multi-person events update for all assigned profiles
- [ ] Validation same as create (required fields enforced)

---

#### Feature 7.2.3: Delete Event

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want to delete events when plans change so the calendar stays current

**Requirements:**

**Trigger:**

- "Delete" button in event edit modal
- Long-press event (mobile gesture) → Quick action menu with "Delete" option

**Delete Confirmation:**

- Modal: "Delete '[Event Title]'?"
- Message: "This will remove the event from Google Calendar. This cannot be undone."
- Actions:
  - "Delete" (red button)
  - "Cancel" (default button)

**Behavior:**

- Deletes event from Google Calendar
- Removes event from local cache immediately
- Calendar re-renders without deleted event
- No option to "undo" (keeps implementation simple for MVP)

**Acceptance Criteria:**

- [ ] Confirmation modal prevents accidental deletion
- [ ] Event disappears from calendar immediately after confirmation
- [ ] Google Calendar sync within 30 seconds
- [ ] Multi-person events deleted for all assigned profiles
- [ ] No orphaned data left in cache

---

### 7.3 Task Management

#### Feature 7.3.1: Task List View

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want to see all incomplete tasks so important items don't get forgotten

**Requirements:**

**Layout:**

- Separate "Tasks" tab/section (not embedded in calendar initially for MVP)
- Access via navigation: "Calendar" / "Tasks" toggle or tabs
- Task List displays:
  - All incomplete tasks (default view)
  - Option to toggle "Show Completed" (grayed out, strikethrough)
  - Grouped by assigned person (collapsible sections)
  - Sorted by: Due date (overdue first), then creation date

**Task Display (Each Item):**

- [ ] Checkbox (tap to complete/uncomplete)
- Task title (bold if overdue)
- Assigned person indicator (color dot + name)
- Due date (if set) - highlighted red if overdue, orange if due today
- Optional: Notes preview (truncated to 50 chars)

**Interactions:**

- Tap checkbox → Mark complete/incomplete (immediate update)
- Tap task row → Opens task detail modal (view full details)
- Swipe left (mobile) → Quick delete action

**Acceptance Criteria:**

- [ ] Tasks load in <1 second
- [ ] Checkbox toggle responds instantly (<100ms)
- [ ] Overdue tasks clearly highlighted (visual distinction)
- [ ] 4-year-old can identify "their tasks" by color
- [ ] Completed tasks visually distinct (strikethrough, grayed)
- [ ] Empty state message if no tasks: "No tasks yet. Tap + to create one."

---

#### Feature 7.3.2: Create Task

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want to create tasks with due dates so responsibilities are clear

**Requirements:**

**Trigger:**

- "+" button in Tasks view → Opens "New Task" modal

**Task Form Fields:**

1. **Task Title** (required)
   - Text input, max 100 characters
   - Placeholder: "What needs to be done?"
2. **Assign To** (required)
   - Radio buttons or checkboxes (allow multiple assignees?)
   - **Decision Needed:** Single assignee vs multiple?
     - **Recommendation:** Single assignee for MVP (simpler UX, clear ownership)
     - If multi-person task needed, create duplicate tasks (one per person)
3. **Due Date** (optional)
   - Date picker (no time, just date)
   - "No due date" option (for ongoing tasks)
   - Quick options: Today, Tomorrow, This Weekend
4. **Notes** (optional)
   - Text area, max 300 characters
   - Placeholder: "Additional details"

**Actions:**

- "Save" button → Creates task in database
- "Cancel" button → Discards, closes modal

**Acceptance Criteria:**

- [ ] Modal opens in <300ms
- [ ] Validation prevents saving without title and assignee
- [ ] Task appears in task list immediately after saving
- [ ] Date picker is touch-friendly
- [ ] Duplicate task detection (warn if very similar task exists)

---

#### Feature 7.3.3: Complete/Uncomplete Task

**Priority:** P0 (Must Have)  
**User Story:** As a child, I want to check off completed tasks so I feel accomplished

**Requirements:**

**Interaction:**

- Tap checkbox next to task → Toggles completion state
- Completed task:
  - Checkbox shows checkmark (✓)
  - Text gets strikethrough styling
  - Task grayed out (opacity 50%)
  - Moves to bottom of list (or separate "Completed" section)
- Uncomplete task:
  - Tap completed task checkbox → Removes checkmark
  - Task returns to normal styling
  - Returns to appropriate position in list

**Visual Feedback:**

- Brief animation when completing (subtle scale/fade)
- Success indicator (small confetti animation for child?)
  - **Decision:** Include fun animation for child engagement? Yes, but keep it subtle (1 second max)

**Persistence:**

- Completion state saved to database immediately
- Synced across all devices in real-time
- Completed tasks retained for 30 days before auto-deletion (configurable)

**Acceptance Criteria:**

- [ ] Checkbox toggle responds in <100ms
- [ ] Completion status syncs across devices within 5 seconds
- [ ] 4-year-old can easily tap checkboxes (minimum 44x44px touch target)
- [ ] Visual feedback clear (child understands task is done)
- [ ] Completed tasks collapsible (don't clutter view)

---

### 7.4 Google Calendar Integration

#### Feature 7.4.1: Two-Way Sync with Google Calendar

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want events to sync with Google Calendar so my phone calendar stays updated

**Requirements:**

**Initial Setup:**

- Google Calendar API OAuth authentication
- User grants permission for calendar read/write access
- Select which Google Calendar to sync (if multiple exist)
  - **Default:** Primary calendar
  - **Option:** Select specific calendar or create new "Family Calendar"
- Store refresh token securely on server

**Sync Behavior:**

- **From Google Calendar → App:**
  - Poll Google Calendar API every 5 minutes for changes
  - Detect: New events, updated events, deleted events
  - Update local cache with changes
  - Push updates to all connected clients via WebSocket
- **From App → Google Calendar:**
  - When event created/edited/deleted in app, immediately call Google Calendar API
  - Update Google Calendar in real-time (no batch processing for MVP)
  - Handle API errors gracefully (retry logic, user notification if sync fails)

**Conflict Resolution:**

- If event modified in both places since last sync:
  - **Strategy:** Last-write-wins (Google Calendar is source of truth)
  - Show user notification: "Event updated in Google Calendar. Reloading."
  - Option to view "conflict history" in advanced settings (post-MVP)

**Error Handling:**

- API rate limits → Exponential backoff retry
- Network errors → Queue changes, sync when online
- Auth token expired → Re-authenticate flow (background if possible)
- Sync failures → Show warning banner: "Calendar sync issues. Tap to resolve."

**Acceptance Criteria:**

- [ ] Events created in app appear in Google Calendar within 30 seconds
- [ ] Events created in Google Calendar appear in app within 5 minutes (next poll cycle)
- [ ] Event edits sync bidirectionally within 5 minutes
- [ ] Deleted events sync within 5 minutes
- [ ] Multi-person events store assignees in Google Calendar (custom field or description)
- [ ] Sync status indicator visible (last sync time, sync in progress)
- [ ] No data loss during sync conflicts (Google Calendar wins, app updates)

---

#### Feature 7.4.2: Profile Assignment Storage

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want multi-person events to retain their profile assignments when syncing with Google Calendar

**Requirements:**

**Challenge:**

- Google Calendar API doesn't natively support "assignees" beyond event attendees
- Need to store profile assignment data persistently

**Solution Options:**

1. **Store in Event Description (Recommended for MVP):**

   - Append hidden metadata to event description field
   - Format: `<!-- FAMILY_PROFILES: [1,3] -->` at end of description
   - Parse on import to extract profile assignments
   - Pros: Simple, no custom database needed, syncs everywhere
   - Cons: Description field cluttered, could be manually edited/broken

2. **Separate Database Table (Future Enhancement):**
   - Store event ID → profile mapping in local database
   - Sync only event data to Google Calendar
   - Local DB holds profile relationships
   - Pros: Clean Google Calendar data, more robust
   - Cons: More complex, profile data doesn't sync to other devices without custom backend logic

**MVP Approach:** Store in Description Field

- When creating/editing event:
  - Append `<!-- PROFILES: [1,2] -->` to description
  - Hidden in most calendar views (HTML comment not rendered)
- When reading events:
  - Parse description for profile metadata
  - Extract profile IDs
  - Render with appropriate colors
- If metadata missing/corrupted:
  - Default: Assign to all profiles (safe fallback)
  - Log warning for manual review

**Acceptance Criteria:**

- [ ] Profile assignments persist through Google Calendar sync
- [ ] Multi-person events show correct colors after round-trip sync
- [ ] Profile metadata doesn't interfere with Google Calendar mobile app
- [ ] Invalid/missing metadata handled gracefully (default to all profiles)
- [ ] Test: Create event in app → View in Google Calendar web → Edit in Google Calendar → Verify profiles retained

---

### 7.5 Progressive Web App (PWA)

#### Feature 7.5.1: Mobile-Responsive Interface

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want to access the calendar from my phone so I can add events when away from home

**Requirements:**

**Responsive Breakpoints:**

- **Large (Desktop/Touchscreen):** 1024px+
  - Full week view with time grid
  - Side-by-side calendar + task list
  - Large touch targets optimized for touchscreen
- **Medium (Tablet):** 768px - 1023px
  - Adjusted layout, still shows full week
  - Stacked calendar and task list (tabs or scroll)
- **Small (Mobile):** 320px - 767px
  - Default to day view (week view too cramped)
  - Bottom navigation (calendar/tasks)
  - Optimized for thumb-friendly tapping

**Touch Optimization:**

- All buttons minimum 44x44px (iOS Human Interface Guidelines)
- Adequate spacing between interactive elements (8px minimum)
- Swipe gestures:
  - Swipe left/right to change days (day view)
  - Swipe down to close modals
- Avoid hover-only interactions (no hover on touch devices)

**Acceptance Criteria:**

- [ ] Interface usable on screens 320px wide (iPhone SE)
- [ ] Interface scales appropriately up to 2560px wide (large displays)
- [ ] No horizontal scrolling required (except intentional like week view swipe)
- [ ] Text remains readable at all sizes (minimum 16px body text)
- [ ] Touch targets meet accessibility guidelines (44x44px minimum)
- [ ] Tested on: iPhone, Android phone, iPad, large touchscreen

---

#### Feature 7.5.2: Installable PWA

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want the app to feel like a native app so it's easy to access

**Requirements:**

**PWA Basics:**

- **Web App Manifest** (`manifest.json`):
  - App name: "Family Calendar"
  - Short name: "Calendar"
  - Icons: 192x192 and 512x512 (PNG, SVG fallback)
  - Start URL: `/`
  - Display mode: `standalone` (looks like native app)
  - Theme color: Primary brand color
  - Background color: White
- **Service Worker:**
  - Cache static assets (HTML, CSS, JS, icons)
  - Offline fallback page (show "No internet connection")
  - Cache API responses (calendar data) for offline viewing
- **HTTPS Requirement:**
  - PWA only works over HTTPS (already planned for Digital Ocean)

**Installation Experience:**

- Browser shows "Add to Home Screen" prompt after 2nd visit
- Icon on home screen launches app in standalone mode (no browser chrome)
- Splash screen shows during app load (icon + background color)
- App appears in app switcher like native app

**Acceptance Criteria:**

- [ ] App installable via "Add to Home Screen" (iOS Safari, Android Chrome)
- [ ] Installed app launches without browser UI (standalone mode)
- [ ] App icon appears correctly on home screen
- [ ] Service worker caches assets for faster subsequent loads
- [ ] Basic offline viewing (cached events) works without internet
- [ ] Lighthouse PWA score 90+ (best practices)

---

#### Feature 7.5.3: Real-Time Sync Across Devices

**Priority:** P0 (Must Have)  
**User Story:** As a parent, I want changes made on mobile to appear on the touchscreen immediately so everyone sees updates

**Requirements:**

**Sync Architecture:**

- **WebSocket Connection:**
  - Establish persistent WebSocket connection from each client to server
  - Connection maintained while app is open
  - Auto-reconnect if connection drops
- **Event Broadcasting:**
  - When any client creates/edits/deletes event or task:
    1. Client sends change to server via REST API
    2. Server updates database
    3. Server broadcasts update to all connected clients via WebSocket
    4. Clients receive update and re-render immediately
- **Conflict Resolution:**
  - If two clients edit same event simultaneously:
    - Last write wins (simpler for MVP)
    - Show notification to user: "Event updated remotely"

**Sync Triggers:**

- Event created → All clients see new event within 2 seconds
- Event edited → All clients see update within 2 seconds
- Event deleted → All clients remove event within 2 seconds
- Task completed → All clients see checkbox toggle within 2 seconds
- Filter changed → Only affects local client (not synced)

**Offline Handling:**

- If device loses internet:
  - Show warning banner: "Offline - changes will sync when reconnected"
  - Allow local changes (optimistic UI updates)
  - Queue changes in memory
  - When reconnected, send queued changes to server
  - Resolve conflicts (server wins if data changed remotely)

**Acceptance Criteria:**

- [ ] Changes on mobile appear on touchscreen within 2 seconds
- [ ] Changes on touchscreen appear on mobile within 2 seconds
- [ ] Works with 3+ devices connected simultaneously
- [ ] Reconnects automatically after temporary network loss
- [ ] No data loss during offline period (changes queue)
- [ ] Visual indicator shows sync status (syncing, synced, offline)

---


## 8. Technical Architecture

### 8.0 Repository Structure

The project is split into two repositories:

1. **family-hub** (Frontend)
   - React 18+ with Vite
   - Progressive Web App (PWA)
   - All UI components and client-side state
   - Repository: `family-hub` (current)

2. **family-hub-api** (Backend) - _Future (Phase 2)_
   - Spring Boot 3.x REST API
   - PostgreSQL database
   - Google Calendar integration
   - WebSocket server
   - Repository: `family-hub-api` (to be created)

**Note on Profiles/Members and Event Sources:**

- The end-goal is for family member profiles to be created either locally (in-app) or via Google OAuth. If a profile is linked to a Google account, the app can pull events from that member's Google Calendar and render them, assigning events to the corresponding profile. This is optional—e.g., a child profile may not have a Google account and would only have events created locally.
- Events can originate from Google Calendar (for linked profiles) or be created locally through FamilyHub, and then associated to one or more profiles.
- **The data in `src/lib/calendar-data.ts` is placeholder/mock data to enable rapid UI prototyping and iteration; it is not intended for production use.** All profile and event data will be managed via backend APIs in Phase 2.

---

## 8.1 Frontend-Backend API Contract

The frontend is built with these API expectations. The backend (family-hub-api) should implement these endpoints:

### Events API

```
GET    /api/events?start={date}&end={date}  - List events in range
GET    /api/events/:id                       - Get event details
POST   /api/events                           - Create event
PUT    /api/events/:id                       - Update event
DELETE /api/events/:id                       - Delete event
```

### Tasks API

```
GET    /api/tasks?assignedTo={profileId}     - List tasks
POST   /api/tasks                            - Create task
PUT    /api/tasks/:id                        - Update task
PATCH  /api/tasks/:id/toggle                 - Toggle completion
DELETE /api/tasks/:id                        - Delete task
```

### Profiles API

```
GET    /api/profiles                         - List family members
PUT    /api/profiles/:id                     - Update profile
```

### Meals API (Future)

```
GET    /api/meals?week={date}                - Get week's meal plan
PUT    /api/meals/:date                      - Update day's meals
```

### Lists API (Future)

```
GET    /api/lists                            - Get all lists
GET    /api/lists/:id                        - Get list with items
POST   /api/lists                            - Create list
PUT    /api/lists/:id/items/:itemId          - Update item
```

### WebSocket Topics

```
/topic/events                                - Event updates
/topic/tasks                                 - Task updates
/topic/sync                                  - Sync status
```

### 8.2 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  Touchscreen   │  │  Mobile Phone  │  │  Tablet/Laptop │ │
│  │    (React)     │  │    (React)     │  │    (React)     │ │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘ │
│           │                   │                   │          │
│           └───────────────────┼───────────────────┘          │
│                               │                              │
└───────────────────────────────┼──────────────────────────────┘
                                │ HTTPS/WSS
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Spring Boot Backend (Java)                 ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ││
│  │  │ REST API     │  │  WebSocket   │  │ Google Cal   │  ││
│  │  │ Controllers  │  │  Handler     │  │ Integration  │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│  ┌────────────────┐              ┌─────────────────────────┐│
│  │  PostgreSQL    │              │  Google Calendar API    ││
│  │   (Tasks,      │              │   (Events, External)    ││
│  │   Settings)    │              │                         ││
│  └────────────────┘              └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

DEPLOYMENT: Single Digital Ocean Droplet (Ubuntu 24.04)
```

### 8.3 Technology Stack

**Frontend (family-hub repository):**

- **Framework:** React 18.x with TypeScript
- **Build Tool:** Vite 7.x (fast dev experience, HMR)
- **Component Library:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS v4 with PostCSS
- **State Management:** React useState/useReducer (local state for MVP)
- **Icons:** Lucide React
- **Date Handling:** date-fns
- **Form Validation:** React Hook Form + Zod
- **Theme:** next-themes (dark mode support ready)
- **Calendar Components:** Custom implementation (not FullCalendar)
- **Path Aliases:** @ → src/

**Note:** FullCalendar was evaluated but custom components were built instead for better control over touch UX and Skylight-inspired styling.

**Backend (family-hub-api repository):**

- **Framework:** Spring Boot 3.x (Java 17+)
- **API:** RESTful endpoints (Spring MVC)
- **WebSocket:** Spring WebSocket (STOMP over WebSocket)
- **Database:** PostgreSQL 15+
- **ORM:** Spring Data JPA (Hibernate)
- **Authentication:** OAuth 2.0 (Google Calendar API)
- **Validation:** Jakarta Bean Validation
- **Logging:** SLF4J + Logback

**Database:**

- **RDBMS:** PostgreSQL (running on same server)
- **Schema:**
  - `profiles` - Family member profiles (id, name, color)
  - `tasks` - Task list items (id, title, assigned_to, due_date, completed, notes, created_at)
  - `settings` - App configuration (sync_interval, calendar_id, etc.)
  - `sync_log` - Google Calendar sync audit trail (optional, for debugging)

**Infrastructure:**

- **Hosting:** Digital Ocean Droplet (2GB RAM, 50GB SSD - ~$12/month)
- **OS:** Ubuntu 24.04 LTS
- **Web Server:** Nginx (reverse proxy, SSL termination)
- **SSL:** Let's Encrypt (Certbot for HTTPS)
- **Process Manager:** systemd (Spring Boot) + PM2 (React if needed)
- **Domain:** Custom domain (TBD - e.g., familycal.yourdomain.com)

**External APIs:**

- **Google Calendar API v3**
  - Scopes: `calendar.events` (read/write access)
  - OAuth 2.0 flow for authorization
  - API key + OAuth tokens stored securely

### 8.3 Data Models

#### Profile (Family Member)

```json
{
  "id": 1,
  "name": "Dad",
  "color": "#3B82F6",
  "created_at": "2024-12-11T00:00:00Z"
}
```

#### Task

```json
{
  "id": 123,
  "title": "Buy groceries",
  "assigned_to": 1, // profile_id
  "due_date": "2024-12-15", // nullable
  "completed": false,
  "notes": "Milk, eggs, bread", // nullable
  "created_at": "2024-12-11T10:00:00Z",
  "updated_at": "2024-12-11T10:00:00Z"
}
```

#### Event (Google Calendar Event + Local Metadata)

```json
{
  "id": "google_event_abc123",
  "title": "Soccer Practice",
  "start": "2024-12-15T15:00:00Z",
  "end": "2024-12-15T16:30:00Z",
  "all_day": false,
  "location": "Park Field",
  "notes": "Bring water bottle",
  "profiles": [1, 3], // assigned to Dad + Child
  "color": "#3B82F6,#F59E0B", // multi-color
  "google_calendar_id": "primary",
  "source": "google_calendar" // or "local" if created in app
}
```

### 8.4 API Endpoints

#### Event Endpoints

```
GET    /api/events                    - List all events (with query params for date range)
GET    /api/events/:id                - Get single event details
POST   /api/events                    - Create new event
PUT    /api/events/:id                - Update event
DELETE /api/events/:id                - Delete event
GET    /api/events/sync               - Trigger manual Google Calendar sync
```

#### Task Endpoints

```
GET    /api/tasks                     - List all tasks (query: completed, assigned_to)
GET    /api/tasks/:id                 - Get single task
POST   /api/tasks                     - Create new task
PUT    /api/tasks/:id                 - Update task
DELETE /api/tasks/:id                 - Delete task
PATCH  /api/tasks/:id/complete        - Toggle task completion
```

#### Profile Endpoints

```
GET    /api/profiles                  - List all family member profiles
GET    /api/profiles/:id              - Get single profile
POST   /api/profiles                  - Create new profile (rare, usually fixed 3)
PUT    /api/profiles/:id              - Update profile (name, color)
```

#### Settings Endpoints

```
GET    /api/settings                  - Get app settings
PUT    /api/settings                  - Update app settings
POST   /api/settings/google-calendar  - Configure Google Calendar integration
```

#### WebSocket Topics

```
/topic/events                         - Broadcast event updates to all clients
/topic/tasks                          - Broadcast task updates to all clients
```

### 8.5 Security Considerations

**Authentication:**

- **MVP:** No user authentication (single-family use, trusted network)
- **Future:** Basic auth or token-based auth if exposing to internet

**Google Calendar OAuth:**

- OAuth 2.0 tokens stored securely in database (encrypted)
- Refresh tokens used to maintain access without re-auth
- Token expiry handled gracefully (auto-refresh)

**Data Privacy:**

- HTTPS only (Let's Encrypt SSL certificate)
- No external analytics or tracking (privacy-first)
- Data stored on self-hosted server (not third-party SaaS)

**Input Validation:**

- Server-side validation on all API endpoints (Spring Validation)
- SQL injection prevention (parameterized queries via JPA)
- XSS prevention (React escapes by default, sanitize user input)

**Rate Limiting:**

- Google Calendar API rate limits respected (backoff strategy)
- Consider basic rate limiting on own API endpoints (prevent abuse)

---

## 9. User Interface & Design

> **⚠️ NOTE - DESIGN IN PROGRESS:**  
> The frontend UI/UX design is **not final** and will be initially generated using **Vercel's v0** (AI-powered UI generation tool). The generated components will serve as a starting foundation which we will then analyze, extend, and customize to meet our specific requirements. The design principles and guidelines below represent our target aesthetic and functional goals, which will inform both the v0 generation prompts and our subsequent customizations.

### 9.1 Design Principles

1. **Touch-First Design:**

   - All interactive elements minimum 44x44px (Apple HIG recommendation)
   - Generous spacing between buttons (8px minimum)
   - No hover-dependent interactions
   - Swipe gestures for navigation where appropriate

2. **Visual Clarity:**

   - High contrast text (WCAG AA compliance)
   - Color as secondary cue (not sole indicator)
   - Large, readable fonts (minimum 16px body, 24px headers)
   - Icons supplement text labels

3. **Child-Friendly:**

   - Bright, inviting colors
   - Simple language (short words, clear actions)
   - Visual feedback for all interactions
   - Emoji/icon support for non-readers

4. **Information Hierarchy:**

   - Most important info (today's schedule) immediately visible
   - Less urgent info (future events) accessible but not distracting
   - Progressive disclosure (don't overwhelm with all data at once)

5. **Consistency:**
   - Same interaction patterns throughout app
   - Predictable navigation
   - Familiar conventions (calendar grids, checkboxes)

### 9.2 Navigation Structure

**Primary Navigation (Vertical Tab Bar - Left Side):**

1. Calendar (default) - CalendarIcon
2. Lists - ListTodoIcon
3. Chores - CheckSquareIcon
4. Meals - UtensilsCrossedIcon
5. Photos - ImageIcon

**Calendar Sub-Navigation (Top Bar):**

- View Switcher: Day | Week | Month | Schedule
- Family Filter Pills (toggle visibility per member)
- Today Button (in month view)

### 9.3 Color Palette

#### Color Palette (OKLch Color Space)

**Profile Colors:**

- Mom (Coral): oklch(0.72 0.15 25)
- Dad (Teal): oklch(0.65 0.12 195)
- Ethan (Green): oklch(0.7 0.14 145)
- Grandma (Pink): oklch(0.75 0.12 350)
- Grandpa (Purple): oklch(0.6 0.18 285)
- Family (Yellow): oklch(0.85 0.15 90)

**UI Colors (CSS Variables):**

- Background: oklch(0.98 0.01 85) - warm cream
- Card: oklch(1 0 0) - white
- Primary: oklch(0.55 0.18 285) - purple accent
- Foreground: oklch(0.25 0.02 250) - dark text
- Muted: oklch(0.94 0.02 85) - subtle backgrounds
- Border: oklch(0.88 0.02 85) - light borders

**Design System:**

- Uses OKLch color space for perceptually uniform colors
- Warm cream/beige background (Skylight-inspired)
- Purple primary accent color
- Custom scrollbar styling

### 9.4 Typography

**Font Family:** Nunito (Google Fonts)

- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold), 800 (ExtraBold)
- Loaded via Google Fonts CDN in index.html
- Fallback: system sans-serif

_Note: Nunito was chosen for its friendly, rounded aesthetic that appeals to children while remaining professional for adults._

### 9.5 Accessibility

**Touch Targets:**

- Minimum 44x44px for all interactive elements
- 8px spacing between adjacent touch targets

**Color Contrast:**

- WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
- Test all profile colors against white and gray backgrounds

**Keyboard Navigation (Desktop):**

- Tab order logical and predictable
- Focus indicators visible (blue outline)
- Enter/Space activate buttons
- Escape closes modals

**Screen Reader Support:**

- Semantic HTML (nav, main, article, section)
- ARIA labels for icon-only buttons
- Alt text for images (if any)
- Form labels properly associated

**Child Accessibility:**

- Simplified language
- Visual cues (icons, colors) supplement text
- Large touch targets (child motor skills developing)
- Forgiving interactions (hard to break things)

---

## 10. Integration Requirements

### 10.1 Google Calendar API

**Setup Requirements:**

1. Create Google Cloud Project
2. Enable Google Calendar API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs

**OAuth Flow:**

1. User clicks "Connect Google Calendar" in settings
2. Redirect to Google OAuth consent screen
3. User grants calendar.events permission
4. Google redirects back with authorization code
5. Exchange code for access token + refresh token
6. Store tokens securely in database

**API Operations:**

- **List Events:** `GET /calendars/{calendarId}/events`
- **Create Event:** `POST /calendars/{calendarId}/events`
- **Update Event:** `PUT /calendars/{calendarId}/events/{eventId}`
- **Delete Event:** `DELETE /calendars/{calendarId}/events/{eventId}`

**Rate Limits:**

- Queries per day: 1,000,000 (default free tier)
- Queries per 100 seconds per user: 2,000
- **Strategy:** Batch updates where possible, implement backoff for rate limit errors

**Error Handling:**

- 401 Unauthorized → Token expired, refresh token
- 403 Forbidden → Insufficient permissions, re-authenticate
- 429 Too Many Requests → Exponential backoff, retry after delay
- 500 Server Error → Retry with backoff, notify user if persists

### 10.2 WebSocket Communication

**Connection Lifecycle:**

1. Client establishes WebSocket connection on app load
2. Server authenticates connection (future: token-based)
3. Connection maintained while app open
4. Heartbeat/ping-pong to detect dead connections
5. Auto-reconnect if connection drops

**Message Format:**

```json
{
  "type": "EVENT_CREATED | EVENT_UPDATED | EVENT_DELETED | TASK_UPDATED",
  "payload": {
    // Event or task object
  },
  "timestamp": "2024-12-11T10:00:00Z"
}
```

**Client Behavior:**

- On message received → Update local state immediately
- If event in current view → Re-render calendar
- Show brief toast notification: "Calendar updated"

**Server Behavior:**

- When REST API modifies data → Broadcast change to all WebSocket clients
- Exclude originating client from broadcast (they already updated locally)

---

## 11. Non-Functional Requirements

### 11.1 Performance

**Load Times:**

- Initial page load: <2 seconds (with caching)
- Subsequent loads: <500ms (PWA cache)
- Event rendering: <300ms for 100 events
- Calendar view switch: <500ms

**API Response Times:**

- GET requests: <500ms (95th percentile)
- POST/PUT requests: <1 second (95th percentile)
- WebSocket message delivery: <2 seconds

**Google Calendar Sync:**

- Changes from app → Google Calendar: <30 seconds
- Changes from Google Calendar → app: <5 minutes (next poll cycle)

**Database Performance:**

- Task queries: <100ms
- Event cache queries: <200ms

### 11.2 Reliability

**Uptime:**

- Target: 99%+ uptime (reasonable for hobby project)
- Planned maintenance windows communicated in advance

**Data Integrity:**

- No data loss during sync operations
- Transactional database operations
- Regular automated backups (daily)

**Error Recovery:**

- Graceful degradation (offline mode, cached data)
- Automatic retry for failed API calls
- User-facing error messages actionable

### 11.3 Scalability

**Current Scope:**

- Single family (3 users)
- ~100-200 events per month
- ~50 active tasks at any time
- 3-5 concurrent device connections

**Scaling Considerations (Future):**

- Current architecture supports up to ~10 families without changes
- Beyond that: Multi-tenancy, database sharding, load balancing
- Not a concern for MVP (single family use case)

### 11.4 Usability

**Learnability:**

- New user can create an event in <2 minutes (no tutorial)
- 4-year-old can complete tasks with <1 week of practice

**Efficiency:**

- Power user can add event in <30 seconds
- Completing task takes <2 seconds (single tap)

**Error Prevention:**

- Confirmation dialogs for destructive actions (delete)
- Validation prevents invalid data entry
- Auto-save drafts (future enhancement)

### 11.5 Maintainability

**Code Quality:**

- Consistent code style (Prettier for JS, Checkstyle for Java)
- Unit test coverage >70% (critical paths)
- Integration tests for API endpoints
- Component tests for React UI

**Documentation:**

- README with setup instructions
- API documentation (Swagger/OpenAPI)
- Code comments for complex logic
- Architecture diagrams (this PRD)

**Deployment:**

- Automated deployment script (bash/GitHub Actions)
- Version tagging (semantic versioning)
- Rollback plan (previous version backup)

---

## 12. Development Phases

### Phase 1A: Frontend Foundation (COMPLETED)

**Sprint 1: Project Setup & Migration ✅**

- [x] Migrate from Next.js to React + Vite
- [x] Configure Tailwind CSS v4 with PostCSS
- [x] Set up path aliases (@/ → src/)
- [x] Install all dependencies (Radix UI, date-fns, etc.)
- [x] Configure TypeScript
- [x] Rebrand from Skylight to FamilyHub

**Sprint 2: Core Components (COMPLETED via v0 prototype) ✅**

- [x] Navigation tabs component
- [x] Calendar header with family info
- [x] Weekly calendar view with time slots
- [x] Daily calendar view
- [x] Monthly calendar view
- [x] Schedule (agenda) view
- [x] Color-coded event cards
- [x] Family member filter pills
- [x] Add event modal
- [x] Sidebar menu

**Sprint 3: Additional Views (COMPLETED via v0 prototype) ✅**

- [x] Chores view with family member grouping
- [x] Meals view with day selection
- [x] Lists view with multiple list types
- [x] Photos view with lightbox

### Phase 1B: Calendar Module - Frontend Polish (CURRENT)

**Focus:** Complete Calendar module frontend, prepare for backend integration

**Sprint 4: State Management & Data Layer (Calendar Only)** ✅ COMPLETED (December 20, 2024)

- [x] Implement Zustand for calendar state (calendar-store.ts)
- [x] Create domain-specific stores (app, calendar, chores, meals, lists, photos)
- [x] Extract types to centralized `src/lib/types/` directory
- [x] Create CalendarModule orchestrator component
- [x] Simplify App.tsx to layout orchestrator (removed all useState)
- [x] Add view-aware navigation (goToPrevious, goToNext, goToToday)
- [x] Add computed selectors (useIsViewingToday)
- [x] Move calendar navigation into views (CalendarNavigation component)
- [x] Add persistence for filter preferences (localStorage via Zustand middleware)
- [x] Create mock API service layer with TanStack Query (src/api/)
- [x] Add loading states for calendar operations
- [x] Add error handling for calendar actions
- [ ] Implement form validation with Zod (event forms)
- [ ] Optimize event rendering performance

**Sprint 5: PWA & Responsive (Calendar Focused)**

- [ ] Configure PWA manifest
- [ ] Set up service worker (Workbox)
- [ ] Test calendar responsive breakpoints (320px - 2560px)
- [ ] Optimize calendar touch targets and gestures
- [ ] Test calendar on actual touchscreen hardware
- [ ] Add install prompt
- [ ] Test offline calendar viewing (cached events)

**Sprint 6: Calendar Testing & Documentation**

- [ ] Component testing for calendar views (Vitest + Testing Library)
- [ ] E2E testing for calendar workflows (Playwright)
- [ ] README with calendar module documentation
- [ ] API contract documentation for calendar endpoints
- [ ] User guide for calendar features

### Phase 2: Calendar Backend Development (NEXT - Separate Repo)

**Focus:** Build backend for Calendar module only

**Sprint 7: Backend Setup (Calendar Module)**

- [ ] Create family-hub-api repository
- [ ] Spring Boot project initialization
- [ ] PostgreSQL database setup
- [ ] Docker containerization
- [ ] Define calendar schema (events, profiles, sync_log)

**Sprint 8: Calendar API Development**

- [ ] REST API endpoints (events CRUD, profiles)
- [ ] Google Calendar OAuth integration
- [ ] Two-way sync implementation (polling + webhooks)
- [ ] Profile assignment storage (in event metadata)
- [ ] Error handling and retry logic

**Sprint 9: Real-Time Calendar Sync**

- [ ] WebSocket server setup (Spring WebSocket)
- [ ] Event broadcast on create/update/delete
- [ ] Frontend WebSocket client integration
- [ ] Real-time sync testing across 3+ devices
- [ ] Conflict resolution (last-write-wins)

### Phase 3: Additional Modules (FUTURE - After Calendar Complete)

**Sprint 10+: Chores Module**
- [ ] Backend: Task database schema
- [ ] Backend: Task CRUD APIs
- [ ] Frontend: Connect to task APIs
- [ ] Enable Chores tab navigation

**Sprint 11+: Meals Module**
- [ ] Backend: Meal plan database schema
- [ ] Backend: Meal plan APIs
- [ ] Frontend: Connect to meal APIs
- [ ] Enable Meals tab navigation

**Sprint 12+: Lists Module**
- [ ] Backend: Lists and items schema
- [ ] Backend: Lists CRUD APIs
- [ ] Frontend: Connect to lists APIs
- [ ] Enable Lists tab navigation

**Sprint 13+: Photos Module**
- [ ] Backend: Photo storage (S3/Digital Ocean Spaces)
- [ ] Backend: Photo upload/management APIs
- [ ] Frontend: Connect to photo APIs
- [ ] Enable Photos tab navigation

---

## 13. Open Questions & Risks

### Open Questions

**Product Questions:**

1. **Task Assignment:** Should tasks support multiple assignees, or create duplicate tasks?
   - **Recommendation:** Single assignee for MVP (simpler UX), duplicate for multiple people
2. **Completed Task Retention:** How long to keep completed tasks before auto-deletion?
   - **Recommendation:** 30 days (configurable in settings)
3. **Photo Storage:** Where to store screensaver photos? Google Photos API vs local upload vs Dropbox?
   - **Recommendation:** Defer to Phase 2, evaluate free tier options
4. **Custom Profile Colors:** Allow users to change profile colors from defaults?
   - **Recommendation:** Fixed colors for MVP, custom colors in Phase 2
5. **Time Format:** 12-hour (AM/PM) vs 24-hour clock? User preference?
   - **Recommendation:** Default to 12-hour, add setting for 24-hour in Phase 2

**Technical Questions:**

1. **Event Caching Strategy:** How long to cache Google Calendar events locally?
   - **Recommendation:** Cache 7 days past and 30 days future, refresh every 5 minutes
2. **WebSocket Fallback:** If WebSocket fails, fallback to polling?
   - **Recommendation:** Yes, fall back to 30-second polling if WebSocket unavailable
3. **Database Backups:** Automated daily backups, where to store?
   - **Recommendation:** Daily backups to Digital Ocean Spaces (S3-compatible) or local + offsite copy
4. **Monitoring:** How to monitor server health and sync errors?
   - **Recommendation:** Simple logging for MVP, add monitoring (Sentry, DataDog) in Phase 2
5. **Multi-Calendar Support:** Support syncing multiple Google Calendars (work, personal, school)?
   - **Recommendation:** Single calendar for MVP, multi-calendar in Phase 2

### Risks & Mitigations

**Risk 1: Google Calendar API Rate Limits**

- **Impact:** High (blocks core functionality)
- **Likelihood:** Low (generous free tier limits)
- **Mitigation:**
  - Implement exponential backoff
  - Cache events locally, reduce API calls
  - Monitor quota usage in Google Cloud Console

**Risk 2: WebSocket Connection Stability**

- **Impact:** Medium (degrades real-time sync)
- **Likelihood:** Medium (home WiFi can be flaky)
- **Mitigation:**
  - Auto-reconnect logic with exponential backoff
  - Fallback to polling if WebSocket fails
  - Show connection status to user

**Risk 3: Touchscreen Hardware Compatibility**

- **Impact:** High (core user experience)
- **Likelihood:** Low (modern USB touchscreens widely compatible)
- **Mitigation:**
  - Research touchscreen compatibility before purchase
  - Test with borrowed/returnable device first
  - Ensure browser touch event support (Chrome/Firefox)

**Risk 4: Child Usability Issues**

- **Impact:** Medium (reduces adoption by 4-year-old)
- **Likelihood:** Medium (UI design for young children is challenging)
- **Mitigation:**
  - User testing with child throughout development
  - Observe pain points, iterate on design
  - Prioritize visual cues over text

**Risk 5: Scope Creep**

- **Impact:** High (delays MVP launch, burnout)
- **Likelihood:** High (easy to add "just one more feature")
- **Mitigation:**
  - Strict adherence to MVP scope (this PRD)
  - Defer enhancements to Phase 2
  - Track feature requests separately

**Risk 6: Google OAuth Token Expiry**

- **Impact:** Medium (breaks sync until re-auth)
- **Likelihood:** Low (refresh tokens last long-term)
- **Mitigation:**
  - Implement automatic token refresh
  - Graceful re-authentication flow
  - Email notification if refresh fails (future)

---

## 14. Success Criteria

### Launch Criteria (Ready for Family Use)

**Functional Completeness:**

- [ ] Can view calendar in week view
- [ ] Can add/edit/delete events from touchscreen
- [ ] Events sync to Google Calendar within 30 seconds
- [ ] Google Calendar changes appear in app within 5 minutes
- [ ] Can create/complete tasks
- [ ] Multi-person events display correctly with combined colors
- [ ] Can filter events by family member
- [ ] Works on mobile (PWA installable)
- [ ] Touchscreen responds smoothly (<100ms touch latency)

**Quality Bar:**

- [ ] No critical bugs (data loss, crashes)
- [ ] Page load <2 seconds on home WiFi
- [ ] Tested on target touchscreen hardware
- [ ] Tested on iOS and Android phones
- [ ] 4-year-old can complete tasks independently

**Deployment Readiness:**

- [ ] Running on Digital Ocean with HTTPS
- [ ] Database backups configured
- [ ] Error logging in place
- [ ] Basic documentation (README, setup guide)

### Success Metrics (3 Months Post-Launch)

**Adoption:**

- Family uses touchscreen 5+ times per day
- 80%+ of family events visible on calendar
- 4-year-old checks calendar 1+ times per day independently
- Mobile app used 2+ times per day when away from home

**Reliability:**

- 95%+ uptime (excluding planned maintenance)
- Zero data loss incidents
- Sync errors <1% of operations

**User Satisfaction:**

- Reduces "What's happening today?" questions by 70%
- Family rates system 7/10 or higher
- No one requests return to old system (paper calendar, phone apps)

**Portfolio Value:**

- Deployed, production-grade application with public URL
- Clean GitHub repository with documentation
- Can demo in interview settings
- Demonstrates: Full-stack development, API integration, cloud deployment, UX design

---

## 15. Appendix

### 15.1 Glossary

**Terms:**

- **PWA (Progressive Web App):** Web application that behaves like a native mobile app
- **Profile:** Represents a family member with name and color
- **Multi-Person Event:** Event assigned to multiple family members (shows combined colors)
- **Sync:** Process of keeping app data in sync with Google Calendar
- **WebSocket:** Real-time communication protocol for instant updates
- **Service Worker:** Background script enabling offline functionality and caching
- **OAuth:** Authorization protocol for granting API access (Google Calendar)
- **Touchscreen:** 20"+ capacitive touch display (primary interface)

### 15.2 References

**Inspiration:**

- Skylight Calendar (commercial product): https://myskylight.com/products/skylight-calendar/
- Skylight filtering documentation: https://skylight.zendesk.com/hc/en-us/articles/31522159833883

**Technical Documentation:**

- Google Calendar API: https://developers.google.com/calendar/api
- React Documentation: https://react.dev/
- Spring Boot Documentation: https://spring.io/projects/spring-boot
- PWA Documentation: https://web.dev/progressive-web-apps/

**Design Guidelines:**

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines
- Material Design (Touch Targets): https://m3.material.io/foundations/interaction/space-and-touch

### 15.3 Related Documents

- **Technical Design Document (TDD):** To be created (detailed implementation specs)
- **API Documentation:** To be created (Swagger/OpenAPI spec)
- **User Manual:** To be created (family onboarding guide)
- **Deployment Guide:** To be created (infrastructure setup steps)

---

## Document Change Log

| Version | Date       | Author | Changes                                    |
| ------- | ---------- | ------ | ------------------------------------------ |
| 1.0     | 2024-12-11 | Joe    | Initial PRD draft                          |
| 1.1     | 2024-12-12 | Joe    | Document status update                     |
| 1.2     | 2024-12-13 | Claude | FE migration complete, PRD alignment       |
|         |            |        | - Renamed to FamilyHub                     |
|         |            |        | - Split FE/BE repositories                 |
|         |            |        | - Updated scope (Meals, Lists, Photos FE)  |
|         |            |        | - Updated color palette to OKLch           |
|         |            |        | - Updated family member config (6 members) |
|         |            |        | - Added FE-first development phases        |
| 1.3     | 2024-12-14 | Claude | Merged PRD-REVISIONS into main PRD         |
|         |            |        | - Clarified modular dashboard architecture |
|         |            |        | - Calendar module as ONLY MVP scope        |
|         |            |        | - Other modules deferred to Phase 3        |
|         |            |        | - Added note about placeholder data        |
|         |            |        | - Documented Google OAuth profile linking  |
|         |            |        | - Updated development phases (1B, 2, 3)    |
|         |            |        | - This is now single source of truth       |


---

_End of Product Requirements Document_
