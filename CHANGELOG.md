# Changelog

## [0.3.7](https://github.com/joe-bor/FamilyHub/compare/family-hub-v0.3.6...family-hub-v0.3.7) (2026-04-25)


### Features

* **api:** add Google Calendar service layer ([8f0668c](https://github.com/joe-bor/FamilyHub/commit/8f0668c1487199dd40db90be350baac37ec8cde0))
* **api:** add Google Calendar TanStack Query hooks ([1f3ea61](https://github.com/joe-bor/FamilyHub/commit/1f3ea61bb05de04823952f9cabadb7bb6f6b7092))
* **auth:** add Google OAuth return handler with state restoration ([003f6b5](https://github.com/joe-bor/FamilyHub/commit/003f6b558072264bf0a87aae58bdec6d25e41f1d))
* **calendar:** add collapsible description field to event form ([bc95ca0](https://github.com/joe-bor/FamilyHub/commit/bc95ca01e0b908d98033b39ee2e911240e5e657f))
* **calendar:** add description, Google link, and edit/delete guard to event detail ([ac1494b](https://github.com/joe-bor/FamilyHub/commit/ac1494b9d3c5dae363379dd3e9f9185d66d35e0d))
* **calendar:** add Google event guard at orchestrator level and description in mutations ([adfbd61](https://github.com/joe-bor/FamilyHub/commit/adfbd61c929ec7938715726b3dcfd2967ef5e22e))
* **calendar:** add Google icon badge to event cards ([2ac9e3b](https://github.com/joe-bor/FamilyHub/commit/2ac9e3b37a92be5929aafbc60bfad31da6488677))
* **calendar:** add member avatars and responsive spacing to schedule view ([2eb53c4](https://github.com/joe-bor/FamilyHub/commit/2eb53c479155ff776a1524c1e497329c2531b331))
* **calendar:** add MemberAvatar component for member identity display ([f3a1ecb](https://github.com/joe-bor/FamilyHub/commit/f3a1ecbc0a5bc79e188aec9503ec38accee9b742))
* **calendar:** add MobileDailyView with 60px rows and swipe navigation ([f825d91](https://github.com/joe-bor/FamilyHub/commit/f825d91a48df6e251b6ccdf31934afad303045e6))
* **calendar:** add MobileEventDetail full-screen view with colored header ([1a330dc](https://github.com/joe-bor/FamilyHub/commit/1a330dce8a617df5f12e59c3d2849d01add73e86))
* **calendar:** add MobileEventSheet full-screen form wrapper ([e80db98](https://github.com/joe-bor/FamilyHub/commit/e80db9859e37e1c11f73b20edd20807f30c7e934))
* **calendar:** add MobileMonthlyView with dot grid and day event list ([7d310cf](https://github.com/joe-bor/FamilyHub/commit/7d310cf7776921dc64b7c24171650dc0c1d75555))
* **calendar:** add MobileToolbar compact 2-row toolbar ([4f53e02](https://github.com/joe-bor/FamilyHub/commit/4f53e0243bf117a39a2af6631409a8abaa2d40de))
* **calendar:** add MobileWeeklyView with date strip and event list ([125f308](https://github.com/joe-bor/FamilyHub/commit/125f308c8144840bc1e23fbf42c893cc100ee836))
* **calendar:** add SwipeContainer gesture handler for mobile navigation ([1a75530](https://github.com/joe-bor/FamilyHub/commit/1a755301857ea0503fe549e049623d1ec1c63247))
* **calendar:** wire mobile views into CalendarModule with responsive branching ([37a0372](https://github.com/joe-bor/FamilyHub/commit/37a037213676f98f8245f03c27ddbdf42f403989))
* **settings:** add Google Calendar connection section to member profile ([59b853e](https://github.com/joe-bor/FamilyHub/commit/59b853e07b774b9c0af6e776bebc83bf9946db13))
* **settings:** add Google Calendar picker modal ([94145a6](https://github.com/joe-bor/FamilyHub/commit/94145a6477543b00063846af171b051241874c63))
* **types:** add Google Calendar types and description field ([d71ca5a](https://github.com/joe-bor/FamilyHub/commit/d71ca5a410d7fc3530b78c837b1f6ab09fb615bb))
* **ui:** add toast notification component using Radix Toast ([a5eaaa1](https://github.com/joe-bor/FamilyHub/commit/a5eaaa14916caeb8dd210e2a1a091332a1c2b27f))


### Bug Fixes

* **calendar:** initialize member filter on mobile and use hideCancelButton ([afaea96](https://github.com/joe-bor/FamilyHub/commit/afaea9627cd27cd55bce68a5128cf6a8a270ab01))
* **calendar:** parameterize ROW_HEIGHT in CurrentTimeIndicator for mobile ([4dd6b33](https://github.com/joe-bor/FamilyHub/commit/4dd6b335f2281be6dd979db90c9b04fa4a360fdd))
* **calendar:** pass description to edit form so textarea auto-expands ([45b3daf](https://github.com/joe-bor/FamilyHub/commit/45b3dafe5687dea0728910a9972b79fa1a7b4dc9))
* **calendar:** show Google badge on monthly view event pills ([1661866](https://github.com/joe-bor/FamilyHub/commit/16618665fee262c2b188061ef6ab56c629681f74))
* **ci:** pin actions/add-to-project to v1.0.2 (no v1 tag exists) ([#142](https://github.com/joe-bor/FamilyHub/issues/142)) ([843132f](https://github.com/joe-bor/FamilyHub/commit/843132f67e11b0c41ea6a74db895abba0047e7b5))
* **e2e:** add TOKEN_ENCRYPTION_KEY to docker-compose.e2e.yml ([edbfe4a](https://github.com/joe-bor/FamilyHub/commit/edbfe4a4477281671bbf79776fd30740255badf8))
* **e2e:** resolve mobile-chrome test failures from calendar redesign ([d35f7c2](https://github.com/joe-bor/FamilyHub/commit/d35f7c2f4877a0b40a0c56e625e8fa03c3a983d6))
* **e2e:** resolve strict mode violations from description field ([1e9da85](https://github.com/joe-bor/FamilyHub/commit/1e9da85183130aa15b2e48a85b99c4bb3e985a65))
* **e2e:** use valid 32-byte TOKEN_ENCRYPTION_KEY for AES-256 ([5ec583e](https://github.com/joe-bor/FamilyHub/commit/5ec583e418266712e9abd35bbd83ecdb8b19643c))
* prevent picker modal selection reset and toast memory leak ([baff20b](https://github.com/joe-bor/FamilyHub/commit/baff20b38457680698c30cca33ef4f2a9de97cd2))
* remove unused GoogleConnectionStatus type import ([4d11af9](https://github.com/joe-bor/FamilyHub/commit/4d11af91b1acf1ca08d41d557bfb8503938e440f))
* resolve duplicate buttons on mobile and CodeQL string replacement warnings ([fe999c1](https://github.com/joe-bor/FamilyHub/commit/fe999c11618849b4a82830f35f8ec0fc1c65d209))
* **test:** use 202 with JSON body for syncCalendar test ([7d53608](https://github.com/joe-bor/FamilyHub/commit/7d53608edfaf07ed76a63991cc82247e3b3df72b))


### Code Refactoring

* **calendar:** consolidate hex colors, DAY_INITIALS, and fix cross-month label ([472c4c3](https://github.com/joe-bor/FamilyHub/commit/472c4c37c0b99dabd76a99b4fe3251243dae0aa2))


### Documentation

* add cross-repo pointer to product source of truth ([#143](https://github.com/joe-bor/FamilyHub/issues/143)) ([cb47698](https://github.com/joe-bor/FamilyHub/commit/cb4769811547746f117b49ae0508f433759b8f58))
* add Google Calendar FE integration design spec ([749ad1f](https://github.com/joe-bor/FamilyHub/commit/749ad1f4dd9269069b1f3d9cd2bd74ec8453c5c7))
* add Google Calendar FE integration implementation plan ([8583e6d](https://github.com/joe-bor/FamilyHub/commit/8583e6d495b049e7772541f5b4c87e958358b61e))
* add mobile calendar redesign implementation plan ([618565e](https://github.com/joe-bor/FamilyHub/commit/618565e242b24a421f53b456ea8b003d2fb16f96))
* add mobile calendar redesign spec ([2475c71](https://github.com/joe-bor/FamilyHub/commit/2475c719cd660ceefd20167f844b9dd924a74e78))
* added AGENTS.md for codex ([c246348](https://github.com/joe-bor/FamilyHub/commit/c24634824e90efad26d55bfc14b4793d2e5d8f22))
* address spec review — type mapping, naming, cache invalidation, error states ([3677074](https://github.com/joe-bor/FamilyHub/commit/367707456bd40cafcda57aa97447c5f3a642af0a))
* address spec review feedback (critical + important items) ([19e1c8e](https://github.com/joe-bor/FamilyHub/commit/19e1c8e08d6c172c4c349cb608278cc8cc44471e))
* confirm BE OAuth redirect params in spec ([42053b0](https://github.com/joe-bor/FamilyHub/commit/42053b09a5d4fc414a35463fecdb407c450e4426))


### Tests

* add default MSW handlers for Google Calendar endpoints ([88b0c41](https://github.com/joe-bor/FamilyHub/commit/88b0c41b19f9a17f4538fe9af990856d8e66678d))
* add getCalendars service test ([c6e625c](https://github.com/joe-bor/FamilyHub/commit/c6e625c2d134427590b0d8c59e6c64bc6252fccc))
* add syncCalendar service test ([79ee74a](https://github.com/joe-bor/FamilyHub/commit/79ee74a424ddf735843b71ce94d8e2e8c26ce8f0))
* add updateCalendars service test with body assertion ([68c83db](https://github.com/joe-bor/FamilyHub/commit/68c83db38699713fb2dc527b0dc59d95362a6f6d))
* **e2e:** add Google Calendar integration E2E tests ([40363d4](https://github.com/joe-bor/FamilyHub/commit/40363d4b5ade9244f28059365eb8516e7d2360ad))
* **e2e:** add mobile calendar E2E tests for views, forms, and navigation ([d5e4e73](https://github.com/joe-bor/FamilyHub/commit/d5e4e739ecc26df555d812888b7b48c835886bc7))

## [0.3.6](https://github.com/joe-bor/FamilyHub/compare/family-hub-v0.3.5...family-hub-v0.3.6) (2026-03-14)


### Features

* **calendar:** add edit scope dialog and instance-level API routing ([02c7fac](https://github.com/joe-bor/FamilyHub/commit/02c7fac14b0eac561d2338b7feabed2f3b042c79))
* **calendar:** add RecurrencePicker component and extend form schema ([3bcbd0a](https://github.com/joe-bor/FamilyHub/commit/3bcbd0a659d833d23314a26134b8f68b20a88fe5))
* **calendar:** add recurring events support ([cdd52ba](https://github.com/joe-bor/FamilyHub/commit/cdd52baf8c86ecc395b224a29f211c7cb1d9be65))
* **calendar:** integrate RecurrencePicker into EventForm ([683136b](https://github.com/joe-bor/FamilyHub/commit/683136b94ddf100a95f5b7d8e03fc8852122b306))
* **calendar:** show recurrence info in detail modal and event cards ([5e1b976](https://github.com/joe-bor/FamilyHub/commit/5e1b97680d2cb7f93756a1c0488146c332210105))
* **recurrence:** add RRULE builder, parser, and label formatter ([3b6312f](https://github.com/joe-bor/FamilyHub/commit/3b6312fb7370d7e6b2420c10bf12803b7aab5192))
* **types:** extend CalendarEvent for recurring events and add getEventKey utility ([9489a17](https://github.com/joe-bor/FamilyHub/commit/9489a17483ce6d5f3e42cb5be05722b376668eb4))


### Bug Fixes

* **calendar:** guard against null id in optimistic update comparison ([d45c2fc](https://github.com/joe-bor/FamilyHub/commit/d45c2fc55bdac4b07deb4a420868c34b51c474b6))
* **calendar:** remove console.error, add runtime guards, clear stale delete errors ([75d4e95](https://github.com/joe-bor/FamilyHub/commit/75d4e953cf13912764dafe773ed384d018326598))
* **calendar:** remove RRULE: prefix from buildRRule output ([fdf090a](https://github.com/joe-bor/FamilyHub/commit/fdf090a16d90cf76a924d89f5785df4ec1d064fa))
* **calendar:** reset EditScopeDialog scope to 'this' on reopen ([fd7cb96](https://github.com/joe-bor/FamilyHub/commit/fd7cb969e61db08a389c36cb2e54bc1813da2628))
* **docs:** update tech debt tracking and validate family data on rehydration ([42545c7](https://github.com/joe-bor/FamilyHub/commit/42545c7b2973faf79b56ed89d83438c59560d1b6))
* **e2e:** fix selector issues and document edit-all recurrence bug ([e6d6417](https://github.com/joe-bor/FamilyHub/commit/e6d6417037d87ed7faaefa3bff1c26f9d9dc29a7))
* **e2e:** resolve mobile-chrome FAB overlap in weekly view ([cab683c](https://github.com/joe-bor/FamilyHub/commit/cab683ca53cca7ee2fbda5103f198f6b2dd255ea))
* **e2e:** strengthen recurring event assertions after BE PR [#21](https://github.com/joe-bor/FamilyHub/issues/21) ([18e64f8](https://github.com/joe-bor/FamilyHub/commit/18e64f8d70f711b54daf0837d766421c49fc6f2e))
* **e2e:** use exact match for "Daily" recurrence label assertion ([eb3be1d](https://github.com/joe-bor/FamilyHub/commit/eb3be1de8de33120f3e4858ec22a66c6500d265e))
* **settings:** show validation errors for avatar upload ([d649b8c](https://github.com/joe-bor/FamilyHub/commit/d649b8c333e6dcb7f99b1891adadf400f8e42b37))
* **test:** use explicit dates in endDate form tests to avoid validation failure ([051747b](https://github.com/joe-bor/FamilyHub/commit/051747b8c8d1321ebf993674c8f3dcb960beb28d))
* **types:** make isAllDay required in CalendarEvent ([fb700d5](https://github.com/joe-bor/FamilyHub/commit/fb700d5b4da354fce5923d846422f101bf70308a))
* **types:** resolve build errors from id/params type changes ([ec13076](https://github.com/joe-bor/FamilyHub/commit/ec13076610aa6fb4b639a0a43d75644281dd6325))


### Code Refactoring

* **calendar:** deduplicate getOrdinalSuffix, use formatLocalDate in RecurrencePicker ([a1eb31f](https://github.com/joe-bor/FamilyHub/commit/a1eb31f535d176aacd614329b668bc3c5753929e))


### Documentation

* add recurring events tech debt items from PR [#117](https://github.com/joe-bor/FamilyHub/issues/117) review ([c412ccf](https://github.com/joe-bor/FamilyHub/commit/c412ccfeb3f51d9b2b5634318a299d8a15dd821c))
* mark resolved tech debt items as completed ([125aaef](https://github.com/joe-bor/FamilyHub/commit/125aaef525307435651049c7fd4c0e4d2a725280))
* move recurring events E2E item to completed in TECHNICAL-DEBT.md ([c0d05e0](https://github.com/joe-bor/FamilyHub/commit/c0d05e076c5b6df07818d361acd0087888363269))
* move resolved recurring event tech debt items to completed ([22733ee](https://github.com/joe-bor/FamilyHub/commit/22733ee1e2f6f16a9c87da7715b46f4533fc34b3))


### Tests

* **e2e:** add recurring events E2E test suite ([f989d9f](https://github.com/joe-bor/FamilyHub/commit/f989d9f49e160cfdb409d27c66fd469ea52d2708))
* **settings:** add MemberProfileModal mutation payload tests ([f0e3d6a](https://github.com/joe-bor/FamilyHub/commit/f0e3d6a8b4a1c99e343be85270ee3ebaac0bc5e9))

## [0.3.5](https://github.com/joe-bor/FamilyHub/compare/family-hub-v0.3.4...family-hub-v0.3.5) (2026-03-08)


### Features

* add all-day event row above time grid in weekly view ([0b23bd7](https://github.com/joe-bor/FamilyHub/commit/0b23bd7b81b73ed3625eb071f94793309e507048))
* add all-day event section above time grid in daily view ([7c78f89](https://github.com/joe-bor/FamilyHub/commit/7c78f89b582290badf827cc803cc1a872f460d0f))
* add all-day toggle to event form ([cc2f4f5](https://github.com/joe-bor/FamilyHub/commit/cc2f4f5b018e6d10bf6cf534fc99e4abc16f4812))
* add compareEventsAllDayFirst utility and show "All day" label on event cards ([f663b92](https://github.com/joe-bor/FamilyHub/commit/f663b92c2db54fd543d6bd776ddc7366d657472e))
* **calendar:** render multi-day events across all views and detail modal ([c1e259c](https://github.com/joe-bor/FamilyHub/commit/c1e259cf115dcdd55877469c6c2c71680ee6eec5))
* **form:** add end date picker for multi-day all-day events ([989ed82](https://github.com/joe-bor/FamilyHub/commit/989ed822b3547d8249b9dfbb2864928d1f3a9897))
* show "All day" label and sort all-day events first in schedule view ([490d45c](https://github.com/joe-bor/FamilyHub/commit/490d45cff6635435dafcda7ed7c6b1983a29e0d6))
* sort all-day events first and add visual distinction in monthly view ([07f25a3](https://github.com/joe-bor/FamilyHub/commit/07f25a3e625c651b229d45ed96f38dde62d96d71))
* **time-utils:** add isEventOnDate for multi-day range checking ([cbc84f9](https://github.com/joe-bor/FamilyHub/commit/cbc84f9049bc1a45925a872b14c6611c2a4700a6))
* **types:** add endDate to calendar event types and service mapping ([70cdf0f](https://github.com/joe-bor/FamilyHub/commit/70cdf0f5e5d5c15533dd33ed37b7b7d4d5d58450))
* **validation:** add endDate with cross-field validation to event schema ([e763b2b](https://github.com/joe-bor/FamilyHub/commit/e763b2b9c0feff51d37abc2b8ba7534d759ee35d))


### Bug Fixes

* address PR review — normalize dates, clear stale endDate, fix cross-year display ([8a6309c](https://github.com/joe-bor/FamilyHub/commit/8a6309c42b17241d576f5647f770658aa71dd6ec))
* **ci:** add debug step to trace .lighthouseci/ directory ([d7e7dd7](https://github.com/joe-bor/FamilyHub/commit/d7e7dd7af885aec9a3a98a886eec91812b3351f4))
* **ci:** enable include-hidden-files for Lighthouse artifact upload ([b39a5c5](https://github.com/joe-bor/FamilyHub/commit/b39a5c52a5620de83f2f37c1d19a6d8f9783a17b))
* **ci:** split lhci autorun to preserve .lighthouseci/ for artifact upload ([182dc4e](https://github.com/joe-bor/FamilyHub/commit/182dc4e6f0e1c2995b1be72c9d1e4f078fea704a))
* correct indentation after Profiler wrapper removal ([ad52e72](https://github.com/joe-bor/FamilyHub/commit/ad52e72d94b217eeba7544333850f1645999d04f))
* improve accessibility and touch targets for all-day event pills ([e369e17](https://github.com/joe-bor/FamilyHub/commit/e369e17525b5433b94b55108b5ea6401e4bd5dd1))
* make husky pre-commit hook executable ([c578482](https://github.com/joe-bor/FamilyHub/commit/c57848220f50fda1975c4b26ae10c30b47c7c365))
* stretch all-day event pills to fill weekly view column cells ([bed01d4](https://github.com/joe-bor/FamilyHub/commit/bed01d4a50f678f39ba8886c8b8f0741dd092d3f))


### Performance Improvements

* remove React Profiler wrapper from CalendarModule ([c63f317](https://github.com/joe-bor/FamilyHub/commit/c63f317f85f27b8cffbbf54c20abaf797902e197))
* self-host Nunito font to eliminate external request chain ([44399b6](https://github.com/joe-bor/FamilyHub/commit/44399b627b131b6391b7f268fef09e80943e64f3))


### Code Refactoring

* **services:** remove USE_MOCK_API branching ([f370363](https://github.com/joe-bor/FamilyHub/commit/f3703639744ad4b8d5a3dbc016d7dd2616e2c1d3))


### Documentation

* fix perf-utils description in CLAUDE.md ([32c5235](https://github.com/joe-bor/FamilyHub/commit/32c523535dec0129921c8ede0d930a98f9e0f821))
* update env example and clean up mock references ([54a5855](https://github.com/joe-bor/FamilyHub/commit/54a58557a30655fc518cd619ab6f05aeef6697d1))
* update stale mock references in CLAUDE.md and .env.example ([bc27ea5](https://github.com/joe-bor/FamilyHub/commit/bc27ea5ebd9c4cb1d75fa6bea31dd1cc92c51856))


### Tests

* add tests for all-day event comparator, validation bypass, and form toggle ([f38acfe](https://github.com/joe-bor/FamilyHub/commit/f38acfe2df636c6ad6f695bd9ba8df4fd5696f51))
* add tests for multi-day event support ([52afec5](https://github.com/joe-bor/FamilyHub/commit/52afec53b6651e5c8c0d9bab1b18b23e0cce24b5))
* **e2e:** remove dual-mode toggle and mock seeders ([2446428](https://github.com/joe-bor/FamilyHub/commit/2446428d4418d6a3fe82529e20139a64f2ca75c8))

## [0.3.4](https://github.com/joe-bor/FamilyHub/compare/family-hub-v0.3.3...family-hub-v0.3.4) (2026-03-05)


### Bug Fixes

* **e2e:** run mock E2E before real-backend E2E in CI ([7e19a26](https://github.com/joe-bor/FamilyHub/commit/7e19a26338da73db4ef061b1d1e83fa8a6cf0d74))
* **e2e:** use BE-compliant usernames in registration helpers ([83065b6](https://github.com/joe-bor/FamilyHub/commit/83065b6bcc3c452fd39e081bf4d050a652b056fe))
* **validations:** add avatarUrl max length to member schema ([726aa0c](https://github.com/joe-bor/FamilyHub/commit/726aa0cbe93b43a8ee7686b1a187b7cb39206b18))
* **validations:** add email max length to member schemas ([2cf96c8](https://github.com/joe-bor/FamilyHub/commit/2cf96c8760827560cf538765821309bdcd7d2a3b))


### Documentation

* **validations:** add BE DTO alignment references ([cf374ad](https://github.com/joe-bor/FamilyHub/commit/cf374ad1cef1374c1e546ba981fe54519c4460e8))


### Tests

* **e2e:** add API-based test helpers for real backend ([13edf55](https://github.com/joe-bor/FamilyHub/commit/13edf5572d3a7680d868f503e254a100f77199aa))
* **e2e:** update specs for dual-mode (mock + real backend) ([c935544](https://github.com/joe-bor/FamilyHub/commit/c93554439978ec2b6847f6af40937fd870cf630a))

## [0.3.3](https://github.com/joe-bor/FamilyHub/compare/family-hub-v0.3.2...family-hub-v0.3.3) (2026-02-28)


### Bug Fixes

* **a11y:** suppress Radix dialog description warnings ([deb16d5](https://github.com/joe-bor/FamilyHub/commit/deb16d53b1b6969ad41ff6b090f4fd503d184630))
* **api:** resolve relative base URL in HTTP client ([3d3a5a5](https://github.com/joe-bor/FamilyHub/commit/3d3a5a500fe68d696e56bf7997302de41162c346))
* **calendar:** detect stale member IDs in persisted filter ([a8350ed](https://github.com/joe-bor/FamilyHub/commit/a8350ed0c01ea198aabdbc6dd28b74ffa30fe69d))
* **validations:** add location max length to event form schema ([51a9ec5](https://github.com/joe-bor/FamilyHub/commit/51a9ec5e3b1258d0c3010ad9c335bdcea89b4425))
* **validations:** align username max length with backend (30 → 20) ([6f86f7a](https://github.com/joe-bor/FamilyHub/commit/6f86f7ac1f544d2ad27d2e3cd4a08b4028f7c40c))


### Code Refactoring

* **api:** remove id from update request body types ([2c479c2](https://github.com/joe-bor/FamilyHub/commit/2c479c249659f63e73903d53aa84c62d279e4b18))


### Documentation

* **env:** update VITE_USE_MOCK_API comment to reflect current architecture ([cc9e5ca](https://github.com/joe-bor/FamilyHub/commit/cc9e5ca578eebb4edd89ea9518c148bbe20173c7))


### Tests

* **validations:** add username max length boundary tests ([78efab2](https://github.com/joe-bor/FamilyHub/commit/78efab2d031aedbb964bcbfc478d070e99f40d70))

## [0.3.2](https://github.com/joe-bor/FamilyHub/compare/family-hub-v0.3.1...family-hub-v0.3.2) (2026-02-23)


### Features

* **api:** add CalendarEventResponse type and service-layer date mapper ([8750619](https://github.com/joe-bor/FamilyHub/commit/8750619519011e709272e0d2498fec415643e56c))


### Bug Fixes

* **api:** change calendar event update from PATCH to PUT ([b97770d](https://github.com/joe-bor/FamilyHub/commit/b97770decaa2233a822b92efc306b9bf4098c5d8))
* **api:** enforce true PUT semantics in mock handlers ([2715aa9](https://github.com/joe-bor/FamilyHub/commit/2715aa9d1365909b4a2dd38ae11864cbe3ed6e9f))
* **api:** fix URL path resolution for real backend ([bcba8f4](https://github.com/joe-bor/FamilyHub/commit/bcba8f4c8af5d27e68d92b8824d7c652d97958cc))
* **api:** map HTTP 400 to VALIDATION_ERROR ([cceab86](https://github.com/joe-bor/FamilyHub/commit/cceab862c837b7b4bdac9ecfb5884932ced5147b))
* **api:** prevent useFamily query from firing before auth ([93c8c5b](https://github.com/joe-bor/FamilyHub/commit/93c8c5b337c96df19e2fe864f7df15dd9ddf5d47))
* **api:** return string dates from mock and MSW handlers ([9cbf60a](https://github.com/joe-bor/FamilyHub/commit/9cbf60ad37bde1b4103535e2d2c5a29660bcf108))
* **calendar:** coerce null location to undefined for Zod compatibility ([ba9049f](https://github.com/joe-bor/FamilyHub/commit/ba9049f752be4556135fb28a16f7c3a2a7adfab1))
* **calendar:** read editingEvent from store at call time to avoid stale closure ([6b22798](https://github.com/joe-bor/FamilyHub/commit/6b22798f5698756dbc333024e261e8a377a30fe7))
* **e2e:** scope dialog checks and switch to Day view for reliable clicks ([253bb77](https://github.com/joe-bor/FamilyHub/commit/253bb770cbc324d6d1f0b1adc758d614790220d5))
* **e2e:** seed empty calendar to prevent mock event overlap in CRUD test ([bcfc927](https://github.com/joe-bor/FamilyHub/commit/bcfc9273fc021b047dbed3512a1073bd535bf960))
* **test:** use formatLocalDate and remove dead interceptor code ([e304d05](https://github.com/joe-bor/FamilyHub/commit/e304d05da742fcd24a2df176096899c840254dc2))


### Code Refactoring

* **calendar:** remove dead instanceof Date fallback ([f1e0f1e](https://github.com/joe-bor/FamilyHub/commit/f1e0f1ef81dabb67b72561b57d429a7a7e2fbbe3))
* **types:** derive CalendarEventResponse via Omit to reduce duplication ([49aacf1](https://github.com/joe-bor/FamilyHub/commit/49aacf14b1c6d4b254b3f6b0ead98b5341cbfcf1))


### Documentation

* **api:** clarify why useSetupComplete needs auth guard ([4c2d158](https://github.com/joe-bor/FamilyHub/commit/4c2d1585b64dab0e2d48742f55a6c17b8c0d48f5))
* update API contract references for calendar PUT endpoint ([66c1628](https://github.com/joe-bor/FamilyHub/commit/66c1628fbbe8dd86cb8e2ca934a18e3cdbab482e))


### Tests

* **api:** add PUT full-replacement verification tests ([7138a69](https://github.com/joe-bor/FamilyHub/commit/7138a694477cf19db278d82fbd23de17a81bb6b7))
* **calendar:** add integration test for PUT optional field preservation ([de29ada](https://github.com/joe-bor/FamilyHub/commit/de29adacf33a4a987dac19d09f1308244b3f4d02))
* **fixtures:** add createUpdateRequest helper for PUT tests ([4b9c19c](https://github.com/joe-bor/FamilyHub/commit/4b9c19cdf302d2853ec440e5316b439b6a713aac))
* **fixtures:** add wire-format fixtures and update tests for string dates ([08c99b5](https://github.com/joe-bor/FamilyHub/commit/08c99b52d7b827149a7b39cd386ccbc603c65fa2))

## [0.3.1](https://github.com/joe-bor/FamilyHub/compare/family-hub-v0.3.0...family-hub-v0.3.1) (2026-02-17)


### Features

* **a11y:** add data-testid and aria-labels for E2E testing ([8393d79](https://github.com/joe-bor/FamilyHub/commit/8393d79224f2b0c204b9a4cd483505a07a854d72))
* add /tech-debt skill for workflow enforcement ([5769d9e](https://github.com/joe-bor/FamilyHub/commit/5769d9e3bbdee2786a069fcd29db0bcf0bf6c090))
* **api:** add API foundation with TanStack Query setup ([ced18b5](https://github.com/joe-bor/FamilyHub/commit/ced18b58d92e0d34deee3b7a0478a381a439e5dd))
* **api:** add auth hooks with TanStack Query ([4c974a7](https://github.com/joe-bor/FamilyHub/commit/4c974a7444a9061e60cb1e09f49e65b1408f371b))
* **api:** add auth mock handlers ([bf67057](https://github.com/joe-bor/FamilyHub/commit/bf6705792f769f86a0632c109ce0ad3c10911298))
* **api:** add auth service ([0728f24](https://github.com/joe-bor/FamilyHub/commit/0728f245cf88e39c3f3b744695dbcf150583fa56))
* **api:** add calendar service and TanStack Query hooks ([d3fea76](https://github.com/joe-bor/FamilyHub/commit/d3fea768555b979c3997800fc66ac94248b8397e))
* **api:** add family service layer with TanStack Query hooks ([847ed89](https://github.com/joe-bor/FamilyHub/commit/847ed893fd47c38e2c7410fe89aa789c656b19ef))
* **api:** add mock infrastructure with calendar handlers ([8ff7a7e](https://github.com/joe-bor/FamilyHub/commit/8ff7a7e3e4f0819885884cbf4ccb85e720d5b9d8))
* **api:** inject auth header in http client ([8ecbace](https://github.com/joe-bor/FamilyHub/commit/8ecbace9deaf43ccd32d40b0330f26bac8200395))
* **app:** add conditional onboarding flow rendering ([62a687d](https://github.com/joe-bor/FamilyHub/commit/62a687d2e7ac1c2e8005403d30da495840ac6839))
* **app:** render HomeDashboard when activeModule is null ([ad4109f](https://github.com/joe-bor/FamilyHub/commit/ad4109f6f5d1754d918ca61d0a67c7a38915b9b0))
* **app:** update conditional rendering for auth ([474da6f](https://github.com/joe-bor/FamilyHub/commit/474da6ff373f7a5c2f95f92035a4086cfbb32984))
* **auth:** add login flow components ([919fd0f](https://github.com/joe-bor/FamilyHub/commit/919fd0f7a9496f5957764eff78f80b342fbb882c))
* **calendar:** add CalendarNavigation component ([8b7c19f](https://github.com/joe-bor/FamilyHub/commit/8b7c19f1904bbeb8e66064580a8c73a606107cdb))
* **calendar:** add event detail modal state to store ([fddee8c](https://github.com/joe-bor/FamilyHub/commit/fddee8c3c49d1d477a696030d1fee323d21aaa19))
* **calendar:** add EventFormModal combining Dialog + EventForm ([db4e919](https://github.com/joe-bor/FamilyHub/commit/db4e9192342194117819ef4b63f184a520eec388))
* **calendar:** add hasUserSetView flag for smart view defaulting ([2fc15f4](https://github.com/joe-bor/FamilyHub/commit/2fc15f4aa0e10b4a1c0e61583af09e42167707e2))
* **calendar:** add inline delete confirmation ([d18151d](https://github.com/joe-bor/FamilyHub/commit/d18151d493575eda6816506c164ad46251f87e00))
* **calendar:** add uniform month grid with adjacent dates ([2829801](https://github.com/joe-bor/FamilyHub/commit/28298018b11503c4f1153b5eb2b69744ac305c0c))
* **calendar:** auto-default to Schedule view on mobile ([4df9fe6](https://github.com/joe-bor/FamilyHub/commit/4df9fe64661b8800e167a53d43282e1f993bb3f2))
* **calendar:** create EventDetailModal component ([238f4a2](https://github.com/joe-bor/FamilyHub/commit/238f4a24ff73238cc941ababda0f43a8b981f7c7))
* **calendar:** generate sample events with real family member IDs ([163ad68](https://github.com/joe-bor/FamilyHub/commit/163ad680577eb22b0522850d4abb7349775f65bd))
* **calendar:** integrate edit mode with EventFormModal ([c78966d](https://github.com/joe-bor/FamilyHub/commit/c78966da20b7d74099f65e498d99bc9e3357d917))
* **calendar:** integrate Zod validation in AddEventModal ([fd0595f](https://github.com/joe-bor/FamilyHub/commit/fd0595fda27a5bbf93b5744b033139eb48409d24))
* **calendar:** wire event click to detail modal ([cf47f12](https://github.com/joe-bor/FamilyHub/commit/cf47f128ddaba6b614b42b7820d71047c3672389))
* **ci:** add Lighthouse CI for performance tracking ([9afd934](https://github.com/joe-bor/FamilyHub/commit/9afd93413bc1b91075bbde741b461896f7f5c968))
* **ci:** add PWA tracking and document optimization opportunities ([08a86de](https://github.com/joe-bor/FamilyHub/commit/08a86dead38a3fe67b26f1557fc670e33fdbcb73))
* **deploy:** add pre-deploy safety guards ([b10add0](https://github.com/joe-bor/FamilyHub/commit/b10add047e081de6487ef7b592d6b1ecd274403a))
* **family:** add cross-tab sync and improve mobile responsiveness ([43102e5](https://github.com/joe-bor/FamilyHub/commit/43102e57610c9f7e431e4cc3060c1237097d45d4))
* **family:** add family store and update type definitions ([c84a5e4](https://github.com/joe-bor/FamilyHub/commit/c84a5e4a144a6b71810c1ba732f3b0c1f5cc7b35))
* **header:** add Home button for mobile navigation ([0920885](https://github.com/joe-bor/FamilyHub/commit/092088591bc65d4d43423fdb74cd2a95190ded43))
* **home:** add HomeDashboard component ([da0a5b1](https://github.com/joe-bor/FamilyHub/commit/da0a5b1624b37fcafdc9b644f80efe74731f1857))
* **hooks:** add useDebounce hook ([c11c760](https://github.com/joe-bor/FamilyHub/commit/c11c7603c67be949a71850a669734d7bac51fe63))
* **hooks:** add useIsMobile hook for responsive detection ([3174d82](https://github.com/joe-bor/FamilyHub/commit/3174d82ae853e63504ea04d25e9513d90d957381))
* **nav:** hide NavigationTabs on mobile ([04f7243](https://github.com/joe-bor/FamilyHub/commit/04f7243cb731133c02c7a4936f9601eec55c4f88))
* **onboarding:** add credentials step ([3355218](https://github.com/joe-bor/FamilyHub/commit/3355218e42152f1bd30899f4da345f6663a264cd))
* **onboarding:** add error handling to registration mutation ([befe8b9](https://github.com/joe-bor/FamilyHub/commit/befe8b9c9f0153672cd402afa49f2da98ce30f43))
* **onboarding:** add error prop to OnboardingCredentials ([8806a38](https://github.com/joe-bor/FamilyHub/commit/8806a381b79921ae4abf020d2e2f68a957797393))
* **onboarding:** add family setup wizard components ([5a37575](https://github.com/joe-bor/FamilyHub/commit/5a375755a6b9d422a7d3a9ceb92ded650cf9b411))
* **providers:** seed family cache from localStorage on startup ([6f163de](https://github.com/joe-bor/FamilyHub/commit/6f163de10a69ba6a097961b7d75ec7c54326abd6))
* **pwa:** add app icons and favicons ([bd10537](https://github.com/joe-bor/FamilyHub/commit/bd10537adb0d1c4aa8ea46ad44a9f4259ca64ad8))
* **pwa:** add PWA meta tags to index.html ([13f0aa3](https://github.com/joe-bor/FamilyHub/commit/13f0aa30a093cdef8afb35ded1ff4aeeb61acc2a))
* **pwa:** configure vite-plugin-pwa ([9ed0e05](https://github.com/joe-bor/FamilyHub/commit/9ed0e05e0a3c5c4b9ba92c37db9c1626e1537caa))
* **settings:** add family settings modal with member management ([a51970b](https://github.com/joe-bor/FamilyHub/commit/a51970b6f0b652b16c24a7f188aeadc4c0447f2b))
* **settings:** add MemberProfileModal component ([12a66db](https://github.com/joe-bor/FamilyHub/commit/12a66dbf4eeac4778aac8e6d94a343b3ecca9f7e))
* **sidebar:** add logout button ([8dacb57](https://github.com/joe-bor/FamilyHub/commit/8dacb57e89e375c0b69ddff181c553e8dea265f4))
* **sidebar:** wire member buttons to open profile modal ([e245b26](https://github.com/joe-bor/FamilyHub/commit/e245b260504fbf8de77b36f50435eb94cde89e1e))
* **store:** allow null activeModule for home dashboard ([e49685f](https://github.com/joe-bor/FamilyHub/commit/e49685fff6acf1ee1061a0e8e08049e189660880))
* **stores:** add auth store for token hydration ([47e220a](https://github.com/joe-bor/FamilyHub/commit/47e220ab5217740ddfff6f3467ea65ec47f5c263))
* **stores:** add Zustand state management ([0cacf78](https://github.com/joe-bor/FamilyHub/commit/0cacf78050d59ddd0c0f6a5181fd34a239d95d84))
* **test:** add cross-browser and mobile testing to Playwright ([1cb1658](https://github.com/joe-bor/FamilyHub/commit/1cb165865e3eeddc608c3e2142ca551f7308852c))
* **test:** add MSW scaffolding for API mocking ([123d26f](https://github.com/joe-bor/FamilyHub/commit/123d26f28876412c4fedeebc2decfd250e40421a))
* **time-utils:** add getSmartDefaultTimes for visible calendar range ([f2ea03e](https://github.com/joe-bor/FamilyHub/commit/f2ea03ea18e9f7a801e0dfeb2bd6b2da6431c2bc))
* **types:** add auth types and validation schemas ([b7cfe3c](https://github.com/joe-bor/FamilyHub/commit/b7cfe3cc236914b272a8b0a26775d745247c6cc8))
* **types:** add family API request/response types ([0fd86af](https://github.com/joe-bor/FamilyHub/commit/0fd86af7aa19f2b59fb25a70e67469110a8a665c))
* **ui:** add Calendar component with react-day-picker ([77b1883](https://github.com/joe-bor/FamilyHub/commit/77b18839116d02ee083c353dacae598220a0bb20))
* **ui:** add DatePicker component ([023676a](https://github.com/joe-bor/FamilyHub/commit/023676acb4fa861b9fa50925eabfe34d69c7f095))
* **ui:** add Dialog component with Radix primitives ([bed9d8c](https://github.com/joe-bor/FamilyHub/commit/bed9d8c12d6dc746206db955b5b8fb88f287bc20))
* **ui:** add FormError component for form validation display ([f99e479](https://github.com/joe-bor/FamilyHub/commit/f99e4794881f3f4f5ab8e9208e651ee9a23cf454))
* **ui:** add MemberSelector with fixed pill styling ([3569c9b](https://github.com/joe-bor/FamilyHub/commit/3569c9b22771b6a34a78d5c28b0b7bda6fed1716))
* **ui:** add Popover component for dropdowns ([5313ce2](https://github.com/joe-bor/FamilyHub/commit/5313ce2243ca82501dc71e582917ade0da812629))
* **ui:** add TimePicker component ([75c0250](https://github.com/joe-bor/FamilyHub/commit/75c0250fa04e01e088c5e8c1b25ce1427953a8df))
* **ui:** display app version in sidebar ([2c6d913](https://github.com/joe-bor/FamilyHub/commit/2c6d913949815ca8a3c9567d974589746167e58e))
* **ui:** enhance time picker with infinite scroll and touch support ([e68b89f](https://github.com/joe-bor/FamilyHub/commit/e68b89f53f5b32713caae7b9c6edc01379e27bb7))
* **ui:** replace time picker with wheel-style selector ([3ed4e2b](https://github.com/joe-bor/FamilyHub/commit/3ed4e2b585c15fca2c996e11e9b6f238c43a98bd))
* **validation:** add Zod schema for calendar event forms ([f71dfbe](https://github.com/joe-bor/FamilyHub/commit/f71dfbe1fa0732073932cd39e79571291a4d47ce))


### Bug Fixes

* **a11y:** add aria-label to onboarding back buttons ([0da53fe](https://github.com/joe-bor/FamilyHub/commit/0da53feca1cfb4bb19b493f7534c64b9c5b9d0f7))
* **api:** add ValidationError type for backend alignment ([55b21fd](https://github.com/joe-bor/FamilyHub/commit/55b21fd57349179556b3d07a5c8e0906e1de81d2))
* **api:** allow null avatarUrl in UpdateMemberRequest for explicit deletion ([d9f9d11](https://github.com/joe-bor/FamilyHub/commit/d9f9d11ec6cb518908fae3d7a5163f41f9726e9d))
* **api:** map backend errors array in parseErrorResponse ([bbf66c0](https://github.com/joe-bor/FamilyHub/commit/bbf66c0fbf0ca61a9305b64529a5585dcbbce985))
* **biome:** added ignore list ([07a3398](https://github.com/joe-bor/FamilyHub/commit/07a3398b21152152cc268423a5c538b1bda4e32f))
* **calendar:** clamp day when navigating months to avoid overflow ([#20](https://github.com/joe-bor/FamilyHub/issues/20)) ([5c69e93](https://github.com/joe-bor/FamilyHub/commit/5c69e9394ad6fa7b3fc58908ff7c6485dbfed9aa))
* **calendar:** improve event display in day and week views ([ed14eaa](https://github.com/joe-bor/FamilyHub/commit/ed14eaa2ef2b89cdfd234402173b83bfbdb4f625))
* **calendar:** improve navigation touch targets and responsiveness ([6910f5c](https://github.com/joe-bor/FamilyHub/commit/6910f5c93740ba5b8b4b671ff20781bd7ade03f0))
* **calendar:** improve schedule view styling vibrancy ([9e581e3](https://github.com/joe-bor/FamilyHub/commit/9e581e306ed43d6c61cb6bf1021bc6b5536dc78b))
* **calendar:** improve schedule view UI/UX ([a5ef94e](https://github.com/joe-bor/FamilyHub/commit/a5ef94ec17491d0c54fcb9583b94656934551fa4))
* **calendar:** optimize monthly view for mobile screens ([bade718](https://github.com/joe-bor/FamilyHub/commit/bade718e14bfa290f83463773589a491662401cc))
* **calendar:** persist mock events to localStorage ([bf27d76](https://github.com/joe-bor/FamilyHub/commit/bf27d76a18af076731c58b8fbdb3b97c745a296b))
* **calendar:** prevent weekly/daily view breakage on narrow screens ([a39e4b4](https://github.com/joe-bor/FamilyHub/commit/a39e4b482c9d6a64abe9e22c449fccb59dbd8895))
* **calendar:** resolve time format and avatar display bugs ([b9456e1](https://github.com/joe-bor/FamilyHub/commit/b9456e1a17089c066281c790386fe75640fb0267))
* **calendar:** resolve timezone bug in date picker default ([b72595e](https://github.com/joe-bor/FamilyHub/commit/b72595ec5c6f94a76a4821c27f823137874744ae))
* **calendar:** resolve timezone issues in date filtering and event creation ([e6be8f8](https://github.com/joe-bor/FamilyHub/commit/e6be8f821809df4643dcec19f5d3da1fbbc393d7))
* **calendar:** resolve toISOString timezone bug in mutations ([d2a18f9](https://github.com/joe-bor/FamilyHub/commit/d2a18f91e1eaa2370b5d1590d7571900b5dedb01))
* **calendar:** use local timezone for date formatting in edit mode ([96c5d68](https://github.com/joe-bor/FamilyHub/commit/96c5d68b1e01d7c48fbf37b2a0d9b8bc8bde6e85))
* **calendar:** use parseLocalDate in mock handlers ([6a342d5](https://github.com/joe-bor/FamilyHub/commit/6a342d5eb69e21a034a3702016faa192adc66be5))
* **calendar:** use parseLocalDate in optimistic update ([2cfe3d5](https://github.com/joe-bor/FamilyHub/commit/2cfe3d545e73c7080e7e7326f3883c622761dba1))
* **calendar:** use safe local date parsing in form ([a6f3a60](https://github.com/joe-bor/FamilyHub/commit/a6f3a6022b36a790e8f7339037dd7ec04be1f431))
* **calendar:** use stable React keys in schedule view ([e15c024](https://github.com/joe-bor/FamilyHub/commit/e15c024dd374a5470df1bd4f8dc1c1fe0d5ec1b6))
* **ci:** add PR number to Lighthouse artifact name for traceability ([610c96b](https://github.com/joe-bor/FamilyHub/commit/610c96b90b0d65972751a679e4184455bdb856ee))
* **ci:** remove invalid preset option from Lighthouse config ([9218fcc](https://github.com/joe-bor/FamilyHub/commit/9218fcc0e79e51406f04fbeda784464d0ce7615f))
* **ci:** remove lighthouse:no-pwa preset to use warn-only assertions ([662ca0f](https://github.com/joe-bor/FamilyHub/commit/662ca0f6872a74d31479d2a90a4dcc41267b4237))
* **ci:** rename lighthouserc.js to .cjs for ES module compatibility ([f8a66b5](https://github.com/joe-bor/FamilyHub/commit/f8a66b5c8f9f9ee09821d6333a64a64f737a0cec))
* **docs:** update README version from v0.2.0 to v0.3.0 ([24d4609](https://github.com/joe-bor/FamilyHub/commit/24d4609087df88fbdb39534fe296097c15ee66f5))
* **docs:** update README version from v0.2.0 to v0.3.0 ([a317e58](https://github.com/joe-bor/FamilyHub/commit/a317e58c593a3d33dd1d260dfca3d970808269bc))
* **e2e:** disable Query DevTools and optimize CI browser matrix ([85b019d](https://github.com/joe-bor/FamilyHub/commit/85b019d85cc0a34ac5ecac3c3ccf4e98e8bd5c6f))
* **e2e:** handle mobile home dashboard in tests ([1b6b61a](https://github.com/joe-bor/FamilyHub/commit/1b6b61a8504a49b7599a9765037ca63f9e94adb6))
* **e2e:** improve CI stability for calendar CRUD test ([#34](https://github.com/joe-bor/FamilyHub/issues/34)) ([c21ba6c](https://github.com/joe-bor/FamilyHub/commit/c21ba6ce20b257794c9948b193aba52b788420d9))
* **e2e:** improve test selector robustness ([785d6c4](https://github.com/joe-bor/FamilyHub/commit/785d6c4708cae8b4a5ecd6a1a3d631860cc1e801))
* **e2e:** improve test stability for parallel execution ([a717088](https://github.com/joe-bor/FamilyHub/commit/a717088317a675a8a80f488d457813e18948f8b9))
* **e2e:** reduce test flakiness with robust helpers and config ([575f09b](https://github.com/joe-bor/FamilyHub/commit/575f09b6e047a5cdb7e843c72d5c8167b6540b29))
* **e2e:** resolve cross-browser flaky tests ([#29](https://github.com/joe-bor/FamilyHub/issues/29)) ([a8fadcf](https://github.com/joe-bor/FamilyHub/commit/a8fadcf045a624bed6debb44ffac8ae927cfe5b8))
* **e2e:** resolve mobile-chrome and webkit test failures ([5fb2cbe](https://github.com/joe-bor/FamilyHub/commit/5fb2cbe081be0378fd5a4c05c75643d39b58d4cd))
* **e2e:** use button selectors for reliable cross-browser family management tests ([9bd6ce7](https://github.com/joe-bor/FamilyHub/commit/9bd6ce702c381d2f4f892564513d798f617cae14))
* **e2e:** use Escape key to close dialog and run full browser matrix on PRs ([f561ce0](https://github.com/joe-bor/FamilyHub/commit/f561ce0b889d7e19a984f7a54e2e43500b660c92))
* **e2e:** use force click for FAB on mobile ([66a2b06](https://github.com/joe-bor/FamilyHub/commit/66a2b06f8b907f12de1fd4f2806e0ca867765788))
* **family:** add validation and accessibility improvements ([c2e5cb6](https://github.com/joe-bor/FamilyHub/commit/c2e5cb6ffa32322c8c361bb2226cab4cfdbd13d0))
* **family:** address PR [#10](https://github.com/joe-bor/FamilyHub/issues/10) review issues ([32f80a7](https://github.com/joe-bor/FamilyHub/commit/32f80a799234959b4b14de3d8ff9d86a189c2741))
* **family:** wrap console.error in DEV check and fix useAddMember cache ([3ed0d0c](https://github.com/joe-bor/FamilyHub/commit/3ed0d0c2ce07473f9cd8e97cf0791b1ea7838446))
* **header:** clean up mobile header for better UX ([7762a61](https://github.com/joe-bor/FamilyHub/commit/7762a61e445fcb91caddf6729f6bb2697a926cd6))
* **pwa:** optimize icons and improve manifest configuration ([1c5e1be](https://github.com/joe-bor/FamilyHub/commit/1c5e1bee47cd733337e041db38e3acbf356fcc0e))
* **release:** remove release-type override so config-file is respected ([d9c2288](https://github.com/joe-bor/FamilyHub/commit/d9c2288dd75d38592db3cd686a1052d026cb8e6c))
* **settings:** send complete member payload on PUT updates ([b5bf781](https://github.com/joe-bor/FamilyHub/commit/b5bf7812a2eba7bc4874f0d7fb094c7638c40017))
* **test:** add browser API mocks and store isolation ([21a8d99](https://github.com/joe-bor/FamilyHub/commit/21a8d99f1e83109494007b8fe1ba8db04db8f07e))
* **test:** remove duplicate assertion in onboarding test ([09f0062](https://github.com/joe-bor/FamilyHub/commit/09f006270a6ff7675e1967912c4be4580f1a5d99))
* **tests:** resolve form submission race condition in CI ([4af35e2](https://github.com/joe-bor/FamilyHub/commit/4af35e2afa5bcb9533fe3f64b4af008b529a0a95))
* **tests:** resolve form submission race condition in CI ([b3f2d90](https://github.com/joe-bor/FamilyHub/commit/b3f2d900990d4eb2ccffb85035f591738e4e7ab8))
* **tests:** use accessible selectors in calendar and onboarding tests ([74440d3](https://github.com/joe-bor/FamilyHub/commit/74440d301116103b61031061dcf3208fdb5c50e1))
* **time-utils:** handle rounding past visible calendar boundary ([0a67cdc](https://github.com/joe-bor/FamilyHub/commit/0a67cdc5e98afdac1d9d3cfe54bf8d1674dec723))
* **ui:** reposition calendar nav arrows beside month label ([38a62d2](https://github.com/joe-bor/FamilyHub/commit/38a62d21d4c03f212080de544a5f5c20f1c24ef0))
* **validations:** reject whitespace-only event titles ([0674201](https://github.com/joe-bor/FamilyHub/commit/067420188d4fdf84d4f05ee3e432ae88cfb0cfbe))
* **validations:** reject whitespace-only names after trim ([343c6dd](https://github.com/joe-bor/FamilyHub/commit/343c6dd1df7ec8daa7161a02cd914f21e83c74dd))


### Performance Improvements

* add bundle analysis and optimization ([bf6a8d4](https://github.com/joe-bor/FamilyHub/commit/bf6a8d4d481b57aca61147c5777e22c2d25bc2d6))
* **build:** enable React Compiler for automatic memoization ([07573f7](https://github.com/joe-bor/FamilyHub/commit/07573f702502dad3d3d3ebc6a924770ab08a3722))
* **calendar:** add shared time utilities and O(1) member lookup ([9189080](https://github.com/joe-bor/FamilyHub/commit/91890800ab40c6892652e31bbec6f901b776344e))
* **calendar:** optimize Zustand selectors with shallow comparison ([01eb176](https://github.com/joe-bor/FamilyHub/commit/01eb176c20f7d54d5ef75c0a90084bb7518999ff))
* **calendar:** pre-compute events by date in single pass ([652cc65](https://github.com/joe-bor/FamilyHub/commit/652cc65de71bac5d5243d63f8311c384b6fe56ca))
* **calendar:** use O(1) member lookups throughout ([0e82f8d](https://github.com/joe-bor/FamilyHub/commit/0e82f8d82393f4a449c2ac2ddb4ce073932a88b0))
* **e2e:** increase CI workers from 1 to 2 ([2c677c0](https://github.com/joe-bor/FamilyHub/commit/2c677c0186a236aa216b969f42329527dd9a9d7c))


### Code Refactoring

* **api:** change family update HTTP methods from PATCH to PUT ([47138c0](https://github.com/joe-bor/FamilyHub/commit/47138c0f394b43d7ac629919b75985569890d908))
* **api:** derive setupComplete from family data ([87ddd1e](https://github.com/joe-bor/FamilyHub/commit/87ddd1e2b27329fc2bc55a23505eca00854f230f))
* **api:** remove meta field from cache seeding ([cb775d5](https://github.com/joe-bor/FamilyHub/commit/cb775d5d2d2df350fc9ca0b39b5764721f21fdb3))
* **api:** update callers and hooks for PUT semantics ([ba370c8](https://github.com/joe-bor/FamilyHub/commit/ba370c82557f02a63164df8d9b413f57d35cf377))
* **api:** update mock handlers for PUT replacement semantics ([22247c6](https://github.com/joe-bor/FamilyHub/commit/22247c6904d701e76fb240536ca08c84f4367684))
* **app:** simplify App.tsx to layout orchestrator ([45c20b1](https://github.com/joe-bor/FamilyHub/commit/45c20b13b6afeaf36843a802f20016cd147e0f0b))
* **calendar:** add CalendarModule, update components to use stores ([31629ab](https://github.com/joe-bor/FamilyHub/commit/31629abdffc7da39234bc0775ae2c0c4174287ec))
* **calendar:** centralize time conversion utilities ([873df2e](https://github.com/joe-bor/FamilyHub/commit/873df2e500dd36e47b37bba5ea2791a4912030fa))
* **calendar:** extract EventForm from modal structure ([c18a28a](https://github.com/joe-bor/FamilyHub/commit/c18a28ad135e40d2b0d12c54df7defeeebb6f125))
* **calendar:** improve time validation with numeric comparison ([887bfff](https://github.com/joe-bor/FamilyHub/commit/887bfff39965666b8e06e0190ed59b55a9e65f0a))
* **calendar:** integrate TanStack Query hooks with CalendarModule ([a7e0279](https://github.com/joe-bor/FamilyHub/commit/a7e0279a3f611e2cef43fe7f7f85ef663676f401))
* **calendar:** rename CalendarModule.tsx to kebab-case ([6afa8d0](https://github.com/joe-bor/FamilyHub/commit/6afa8d0af955506d21dc5b72a615e3c38c91adeb))
* **calendar:** replace AddEventModal with EventFormModal ([ecb6110](https://github.com/joe-bor/FamilyHub/commit/ecb61109619b523d2431ba5b85565bea3fd08bf8))
* **calendar:** update views to use CalendarNavigation ([b970008](https://github.com/joe-bor/FamilyHub/commit/b970008613aa1d8dc5996c282345c7ebd6f7f53e))
* **calendar:** use getSmartDefaultTimes in EventForm ([48bd657](https://github.com/joe-bor/FamilyHub/commit/48bd657784873974cc2061306c09f2a9803d4203))
* **calendar:** use shared CALENDAR_START_HOUR in view components ([3d9a20d](https://github.com/joe-bor/FamilyHub/commit/3d9a20dc32f73948309d0fdba7cf62ae13c51979))
* **calendar:** wire navigation props through CalendarModule ([aac4e21](https://github.com/joe-bor/FamilyHub/commit/aac4e21a3fbd06badca1b3e191d99cd1abc0bb06))
* **components:** migrate to family API hooks ([258ddca](https://github.com/joe-bor/FamilyHub/commit/258ddcab098b72c4767e6f78cda6b65fc9684565))
* **family:** extract STORAGE_KEY to shared constants ([34acc92](https://github.com/joe-bor/FamilyHub/commit/34acc92bdf3108e35833ebb5963517691edd2c68))
* **imports:** use explicit @/api imports for family hooks ([8593b05](https://github.com/joe-bor/FamilyHub/commit/8593b0516ba072ef1404f62b1a5bbea940a1fcfd))
* migrate components to use dynamic family data from store ([7adc3f7](https://github.com/joe-bor/FamilyHub/commit/7adc3f7399ab6e4a115914942f3882994533afb4))
* **mocks:** simplify response helpers to match unified type ([c67a6c6](https://github.com/joe-bor/FamilyHub/commit/c67a6c6cac997945eff0c4e5922bd49b54a49ec5))
* modularized components ([23eff3b](https://github.com/joe-bor/FamilyHub/commit/23eff3b5c88f8eb712ffeffbcc991f6ce956c3d4))
* **onboarding:** update for wrapped UsernameCheckResponse ([5e8f13f](https://github.com/joe-bor/FamilyHub/commit/5e8f13f003bb70eb71853ad8dd72830554d462cf))
* **shared:** remove calendar navigation from app-header ([ebe6608](https://github.com/joe-bor/FamilyHub/commit/ebe66088234672dc7dec61380fcf14e45925a0ff))
* **shared:** update layout components to use stores ([63b857d](https://github.com/joe-bor/FamilyHub/commit/63b857d44833d6e6d900a20277c263ea828d25af))
* **sidebar:** remove non-functional menu items ([00ca11b](https://github.com/joe-bor/FamilyHub/commit/00ca11b40f3dd7ea1a8fe4fcfd30cf9b3593742b))
* **store:** simplify family-store to hydration-only ([044602f](https://github.com/joe-bor/FamilyHub/commit/044602fbaeeca8f9ffc673c9f227ad533e0d6e32))
* **test:** align test utilities with unified response type ([6c89482](https://github.com/joe-bor/FamilyHub/commit/6c894820eff3767d4699123250e3845a5f06dfcf))
* **test:** extend seedCalendarStore to support all state fields ([74e099e](https://github.com/joe-bor/FamilyHub/commit/74e099e54abb4b2ea59d955f939cc6cae76d377a))
* **test:** remove redundant afterEach cleanup ([62c4b41](https://github.com/joe-bor/FamilyHub/commit/62c4b410a9eb7de7d000356dc21d0422835687bb))
* **tests:** use TEST_TIMEOUTS and helpers in form tests ([1bab248](https://github.com/joe-bor/FamilyHub/commit/1bab248efee0879416f73c60c10d6e78e81e6812))
* **test:** use standard patterns in app-store tests ([47b7561](https://github.com/joe-bor/FamilyHub/commit/47b75612412a840607764d144af03a13bc3eb64a))
* **test:** use standard seeders in calendar-store tests ([88a43a2](https://github.com/joe-bor/FamilyHub/commit/88a43a2aba9f460f0c33820a2e63a8fdc095399a))
* **test:** use standard seeders in family-store tests ([5d85d24](https://github.com/joe-bor/FamilyHub/commit/5d85d24ccd73cd5ab226b0fe0a7c3ca5128cf339))
* **types:** add unified ApiResponse type ([c08a283](https://github.com/joe-bor/FamilyHub/commit/c08a2838b242c20968206ffd48520c13312d7e88))
* **types:** migrate to unified ApiResponse type ([4b01e2b](https://github.com/joe-bor/FamilyHub/commit/4b01e2b687f117db5bdeaf5b6869851bc98689ff))
* **validations:** move member profile schema to validations ([49ea980](https://github.com/joe-bor/FamilyHub/commit/49ea980faa263f4e8902cdea104b483bcfff4326))
* **views:** update module views to use centralized types ([fb2e621](https://github.com/joe-bor/FamilyHub/commit/fb2e62132ae4d04c14fd4b1666c1560e31e857f8))


### Documentation

* add before/after screenshots for onboarding feature ([8c79dce](https://github.com/joe-bor/FamilyHub/commit/8c79dce278f2e14cba89cf8d575f60545d05eadf))
* add env example and document familyService tech debt ([c8cd9fb](https://github.com/joe-bor/FamilyHub/commit/c8cd9fba8fbca880942177d4d8b15b613a6be3ee))
* add event card click pattern and update browser matrix info ([2746071](https://github.com/joe-bor/FamilyHub/commit/27460711c712654f668893e5eb29582b089b02e6))
* add getSmartDefaultTimes and calendar constants to CLAUDE.md ([51117a6](https://github.com/joe-bor/FamilyHub/commit/51117a6e4b7ac7f73883d2d01057b7e329325da4))
* add missing onboarding error handling to tech debt ([19ed7cb](https://github.com/joe-bor/FamilyHub/commit/19ed7cbf2fb16a896d43389e8b365077f6dbda72))
* add mutation hook testing pattern to CLAUDE.md ([d62759b](https://github.com/joe-bor/FamilyHub/commit/d62759b7f74c67ab152915f4701bacc59cbf836f))
* add prerequisites and testing sections ([41d7568](https://github.com/joe-bor/FamilyHub/commit/41d75683b02973e41618729619d3630a5373a9a1))
* add prompt for test pattern standardization task ([346750d](https://github.com/joe-bor/FamilyHub/commit/346750dd60fc1a96e17b3344e203dd370c1e46ea))
* add PWA planning prompt for Sprint 5 ([9e190c8](https://github.com/joe-bor/FamilyHub/commit/9e190c826e91a19b84fae71ea1fda51acbe98acb))
* add race condition pattern for Zustand store testing ([667ece7](https://github.com/joe-bor/FamilyHub/commit/667ece746bb8a544cca4d9f815eafb844e79aeea))
* add screenshots and live demo link ([ab3c58c](https://github.com/joe-bor/FamilyHub/commit/ab3c58cd308e4b263486b6515185fe84fecbebde))
* add sidebar polish items to ROADMAP Sprint 6 ([e31e909](https://github.com/joe-bor/FamilyHub/commit/e31e9092b247d9b34effdd08bd732ae827d0eb21))
* add tech debt items from PR [#67](https://github.com/joe-bor/FamilyHub/issues/67) review ([d3ca335](https://github.com/joe-bor/FamilyHub/commit/d3ca335dd8c64d566550e8c9b90b7c44da469a82))
* add technical debt tracking and update roadmap ([15d51c6](https://github.com/joe-bor/FamilyHub/commit/15d51c63a1ed7d0a93ca9ef9b033320b136546c9))
* add testing commands and patterns to CLAUDE.md ([3b1f1a8](https://github.com/joe-bor/FamilyHub/commit/3b1f1a8a3446352ab349744579ba1b4b4e62ac00))
* add versioning walkthrough (gitignored) ([e592d83](https://github.com/joe-bor/FamilyHub/commit/e592d83a5a6c89e31baf78db31451759c32b2f77))
* add visible screenshot placeholders with proper sizing ([4f3a298](https://github.com/joe-bor/FamilyHub/commit/4f3a2983cc2c82a31cfa78a3f480af97ce1f3b8a))
* add waitForHydration to E2E test pattern example ([cff74ba](https://github.com/joe-bor/FamilyHub/commit/cff74ba8e31434a8841b4554fa91d35d7191f0d6))
* **claude:** update architecture for Zustand state management ([4ee1b43](https://github.com/joe-bor/FamilyHub/commit/4ee1b4347e487e0f7bde80f57a49ca2f35f716fa))
* consolidate documentation for efficiency ([99b2237](https://github.com/joe-bor/FamilyHub/commit/99b2237686139b00449bbec264aa074f8f1f0073))
* created Frontend-specific spec document ([8b01789](https://github.com/joe-bor/FamilyHub/commit/8b017897c35c227cb0aa42db34e5d72097cca299))
* document versioning setup in CLAUDE.md ([8be5bcd](https://github.com/joe-bor/FamilyHub/commit/8be5bcd331293be4f7e072be47fcb7ebae149cb3))
* fix query key in mutation test example ([7b6dffd](https://github.com/joe-bor/FamilyHub/commit/7b6dffd76e8e27e9db4b93506df229943e8107d4))
* **frontend-spec:** update for Zustand refactor and navigation changes ([9d2d564](https://github.com/joe-bor/FamilyHub/commit/9d2d564c36f6322c214bd07a4744291a4a512930))
* mark family mutation tests as complete ([7ae3d32](https://github.com/joe-bor/FamilyHub/commit/7ae3d3264f20f94b2bb270112d64421f59b12ca1))
* mark outdated TODOs as completed in technical debt ([3444acb](https://github.com/joe-bor/FamilyHub/commit/3444acbef24c3dd159619fef02cc14fdd4483009))
* mark Sprint 5 as complete ([f592ea2](https://github.com/joe-bor/FamilyHub/commit/f592ea23897f29c26176f5e7b01483c7b72c07db))
* mark test pattern standardization as complete ([cef82ca](https://github.com/joe-bor/FamilyHub/commit/cef82cacd924f3b21c2d103cf6f18a1fa772a1f5))
* mark Zod form validation as complete in roadmap ([66856b3](https://github.com/joe-bor/FamilyHub/commit/66856b3c39d9760da405a0b1ffe84ac97993b8b4))
* **perf:** document performance optimizations and verification ([bea7f2f](https://github.com/joe-bor/FamilyHub/commit/bea7f2faaaf203a97041595e1f7f2935ca99e04b))
* **prd:** mark Sprint 4 state management as complete ([240d0a6](https://github.com/joe-bor/FamilyHub/commit/240d0a6a17e79a1bf9211dd0aca59eb5ad9781df))
* remove useCreateFamily references from CLAUDE.md ([d73bedd](https://github.com/joe-bor/FamilyHub/commit/d73bedd9210f3d7e105265d73694eece7e4f1701))
* revamp README for public release ([1de9cbf](https://github.com/joe-bor/FamilyHub/commit/1de9cbf2c7cf1d93ce9fd7c9b64febda81213ce2))
* **security:** add VITE_* client exposure warning ([6563f70](https://github.com/joe-bor/FamilyHub/commit/6563f70c4f73170c089437de552082ef64a3c641))
* **security:** update to reflect enabled push protection ([28636d7](https://github.com/joe-bor/FamilyHub/commit/28636d742be32f2df6b80df5e0b331e9e575ba88))
* sync documentation with recent PRs ([121b855](https://github.com/joe-bor/FamilyHub/commit/121b8557d347edb71585d2af2525593e25d2bb11))
* update API response types to unified ApiResponse&lt;T&gt; ([3d3fd68](https://github.com/joe-bor/FamilyHub/commit/3d3fd6886b3cfcdf7951cbe72446282b803f1925))
* update CLAUDE.md and TECHNICAL-DEBT.md for auth testing ([b5af429](https://github.com/joe-bor/FamilyHub/commit/b5af4296b0b83b1825614023ac091331358cd0a3))
* update CLAUDE.md and TECHNICAL-DEBT.md for Lighthouse CI ([2905f2b](https://github.com/joe-bor/FamilyHub/commit/2905f2bfeaaf7515feb3720b8f01800982ee6cb8))
* update CLAUDE.md for setupComplete removal ([fe98c0e](https://github.com/joe-bor/FamilyHub/commit/fe98c0eabb97737ef2ae940036cc42fc5af1fa90))
* update CLAUDE.md with API layer architecture ([4983079](https://github.com/joe-bor/FamilyHub/commit/4983079e3e8b5145353c94a6af2d8ea8a1608ac9))
* update CLAUDE.md with deploy guards, version display, and release-please extra-files ([2869f6b](https://github.com/joe-bor/FamilyHub/commit/2869f6bf0df36b36afa71181cc7a0933f9ede5be))
* update CLAUDE.md with PR [#29](https://github.com/joe-bor/FamilyHub/issues/29) changes ([83cb69c](https://github.com/joe-bor/FamilyHub/commit/83cb69ce941f16c1e94007c1f64d63219996fe77))
* update CLAUDE.md with renamed calendar-module.tsx ([030bb66](https://github.com/joe-bor/FamilyHub/commit/030bb660fdb732712cafb3060fdbd6d232a5808e))
* update documentation for event CRUD and date/time utilities ([582cda6](https://github.com/joe-bor/FamilyHub/commit/582cda61bc427aab720fd65eccecc377aa7a6d9c))
* update documentation for family API migration ([de019b8](https://github.com/joe-bor/FamilyHub/commit/de019b8417fee89d7c6d7b80b1b79ac06549bbd8))
* update documentation for TanStack Query API layer ([c98b413](https://github.com/joe-bor/FamilyHub/commit/c98b413b89db82f2e7011079ae91f3d176a0292c))
* update E2E test patterns and remove dead code ([2945d4a](https://github.com/joe-bor/FamilyHub/commit/2945d4a112abe7f5367f9207f0e00f4d276ccead))
* update ROADMAP ([c10a3df](https://github.com/joe-bor/FamilyHub/commit/c10a3dfc6b4c9376e6d8528df5da59ae19647724))
* update roadmap and add E2E test patterns ([80b5a95](https://github.com/joe-bor/FamilyHub/commit/80b5a9520f56de11b054f2a9ab9d0f99c8b48ad8))
* update roadmap and architecture for responsive changes ([e8ddb17](https://github.com/joe-bor/FamilyHub/commit/e8ddb173f175b504b884a5069a2876f87a549aa2))
* update ROADMAP for Sprint 6 testing progress ([ab5ad30](https://github.com/joe-bor/FamilyHub/commit/ab5ad301c1e8d04811774dc3ee6e26e14b098633))
* update technical debt tracking and CLAUDE.md ([41d9d71](https://github.com/joe-bor/FamilyHub/commit/41d9d71556e1220636b6e0e34ffba550820e3cc9))
* update technical debt with flakiness findings ([1d2e272](https://github.com/joe-bor/FamilyHub/commit/1d2e27226245b8f8f9feec0ecd46e56ddc1ab626))
* update testing documentation and cleanup ([32f4cc9](https://github.com/joe-bor/FamilyHub/commit/32f4cc98d2705b0932a641c1509c2ba87c4abc9a))


### Tests

* add global Zustand store reset to prevent state leakage ([739db87](https://github.com/joe-bor/FamilyHub/commit/739db874e2e61724e0d4b6138f0925726065c672))
* **api:** add family mutation hook tests ([c434974](https://github.com/joe-bor/FamilyHub/commit/c434974b2d8e820a8d0785675a6779680e3d087e))
* **api:** update family mutation tests for PUT semantics ([ac00047](https://github.com/joe-bor/FamilyHub/commit/ac0004757074dca6eeaf46f9f446db2f03919385))
* **app:** add smoke test for app rendering ([7670479](https://github.com/joe-bor/FamilyHub/commit/7670479d6d9c3c6d0a3aaf4b1ee11f396e23ee2e))
* **auth:** add auth store reset to test setup ([e0d9303](https://github.com/joe-bor/FamilyHub/commit/e0d9303b29f7bd10c6ff24182b6e468b1cf0c781))
* **auth:** update tests for new auth flow ([e2cb8e6](https://github.com/joe-bor/FamilyHub/commit/e2cb8e619f45ea4908400f8d09bb476ce4830324))
* **calendar:** add date navigation tests ([d75e41b](https://github.com/joe-bor/FamilyHub/commit/d75e41befea085fc2277a400de551b1e45f26f94))
* **calendar:** add delete event integration tests ([6fbdd22](https://github.com/joe-bor/FamilyHub/commit/6fbdd221500a649d7ed8165f9d0c7ecfdc5322b3))
* **calendar:** add edit event integration tests ([10b1631](https://github.com/joe-bor/FamilyHub/commit/10b1631204c0e98561589bc904e9ab007977c724))
* **calendar:** add event detail modal integration tests ([45be9bc](https://github.com/joe-bor/FamilyHub/commit/45be9bc08aa21185bb58ab68873749b86a0fe1f1))
* **calendar:** add mobile smart defaults test ([a7a2c77](https://github.com/joe-bor/FamilyHub/commit/a7a2c77944b46ef4542a41ce0bbc6a039a90a0ab))
* **e2e:** add calendar event CRUD test ([e99637b](https://github.com/joe-bor/FamilyHub/commit/e99637bc36a7f701b1c4604b02df7fb62f07f060))
* **e2e:** add calendar navigation test ([ae33d79](https://github.com/joe-bor/FamilyHub/commit/ae33d797ad085f5d314f04917ac12ad44ded2cb6))
* **e2e:** add family management test ([c04cfc4](https://github.com/joe-bor/FamilyHub/commit/c04cfc414156991fd50b5672ed1f6204ea660b61))
* **e2e:** add onboarding flow test ([ff242e2](https://github.com/joe-bor/FamilyHub/commit/ff242e272c08e643d69994a14e7b594604938c2a))
* **e2e:** add Playwright test helpers ([6c9a56c](https://github.com/joe-bor/FamilyHub/commit/6c9a56c8809eb972397c6a5fa4940dc0481bb6fd))
* **e2e:** improve onboarding test stability for mobile ([83e3812](https://github.com/joe-bor/FamilyHub/commit/83e3812cca9273eca1be039c0c7f022bb377121d))
* **e2e:** update tests for new auth flow ([63b2636](https://github.com/joe-bor/FamilyHub/commit/63b2636c01542052026e8e6c894a963f6026c711))
* **event-form:** add end time before start time validation test ([d707907](https://github.com/joe-bor/FamilyHub/commit/d7079070761164096ee9fb46fe5b3ca95e4d9bf2))
* **event-form:** fix race condition with Zustand store propagation ([b2e1302](https://github.com/joe-bor/FamilyHub/commit/b2e130290f854b0664eaab37d7482ec2c82390db))
* **family:** add mutation tests for family hooks ([578b1f4](https://github.com/joe-bor/FamilyHub/commit/578b1f4cb415cc497389c674643ace4431c2e611))
* **family:** add tests for use-family hooks ([7216c28](https://github.com/joe-bor/FamilyHub/commit/7216c28c31edffb972fe8bb4da2e6db2cf0513be))
* **infra:** add MSW handlers and test utilities for family API ([b265348](https://github.com/joe-bor/FamilyHub/commit/b265348a5aa069c1c598e6ca38059ae74f5e1ca0))
* **onboarding:** add error handling tests for registration ([11c2db3](https://github.com/joe-bor/FamilyHub/commit/11c2db37e4d25f011da0606d61b5b57e8690cf69))
* **stores:** add comprehensive unit tests for Zustand stores ([#18](https://github.com/joe-bor/FamilyHub/issues/18)) ([618e3fa](https://github.com/joe-bor/FamilyHub/commit/618e3fa197499cfc9f50d0d9b0a405692e2d65c9))
* **store:** update app-store tests for null initial state ([0781682](https://github.com/joe-bor/FamilyHub/commit/0781682c610ce0507629376757105f603c9e1261))
* **time-utils:** add comprehensive unit tests ([a5b8055](https://github.com/joe-bor/FamilyHub/commit/a5b8055389f5d0ad01665aff69e3e992f1e80a18))
* **time-utils:** add tests for getSmartDefaultTimes ([ffac3bd](https://github.com/joe-bor/FamilyHub/commit/ffac3bd334ae671dabf07dbeb6fe12f8a83136d9))
* update tests for family API migration ([4750141](https://github.com/joe-bor/FamilyHub/commit/4750141d66c7b6ba79a87e0e3c8d019752eb90d9))
* **validations:** add comprehensive unit tests for Zod schemas ([87c4001](https://github.com/joe-bor/FamilyHub/commit/87c4001b250bc2f36a1a336db4ccbbfcfc759e3c))

## [0.3.0](https://github.com/joe-bor/FamilyHub/compare/v0.2.0...v0.3.0) (2026-02-15)


### Features

* add /tech-debt skill for workflow enforcement ([5769d9e](https://github.com/joe-bor/FamilyHub/commit/5769d9e3bbdee2786a069fcd29db0bcf0bf6c090))
* **ci:** add Lighthouse CI for performance tracking ([9afd934](https://github.com/joe-bor/FamilyHub/commit/9afd93413bc1b91075bbde741b461896f7f5c968))
* **ci:** add PWA tracking and document optimization opportunities ([08a86de](https://github.com/joe-bor/FamilyHub/commit/08a86dead38a3fe67b26f1557fc670e33fdbcb73))


### Bug Fixes

* **api:** allow null avatarUrl in UpdateMemberRequest for explicit deletion ([d9f9d11](https://github.com/joe-bor/FamilyHub/commit/d9f9d11ec6cb518908fae3d7a5163f41f9726e9d))
* **ci:** add PR number to Lighthouse artifact name for traceability ([610c96b](https://github.com/joe-bor/FamilyHub/commit/610c96b90b0d65972751a679e4184455bdb856ee))
* **ci:** remove invalid preset option from Lighthouse config ([9218fcc](https://github.com/joe-bor/FamilyHub/commit/9218fcc0e79e51406f04fbeda784464d0ce7615f))
* **ci:** remove lighthouse:no-pwa preset to use warn-only assertions ([662ca0f](https://github.com/joe-bor/FamilyHub/commit/662ca0f6872a74d31479d2a90a4dcc41267b4237))
* **ci:** rename lighthouserc.js to .cjs for ES module compatibility ([f8a66b5](https://github.com/joe-bor/FamilyHub/commit/f8a66b5c8f9f9ee09821d6333a64a64f737a0cec))
* **settings:** send complete member payload on PUT updates ([b5bf781](https://github.com/joe-bor/FamilyHub/commit/b5bf7812a2eba7bc4874f0d7fb094c7638c40017))

## [0.2.0](https://github.com/joe-bor/FamilyHub/compare/v0.1.0...v0.2.0) (2026-01-29)


### Features

* **api:** add auth hooks with TanStack Query ([4c974a7](https://github.com/joe-bor/FamilyHub/commit/4c974a7444a9061e60cb1e09f49e65b1408f371b))
* **api:** add auth mock handlers ([bf67057](https://github.com/joe-bor/FamilyHub/commit/bf6705792f769f86a0632c109ce0ad3c10911298))
* **api:** add auth service ([0728f24](https://github.com/joe-bor/FamilyHub/commit/0728f245cf88e39c3f3b744695dbcf150583fa56))
* **api:** inject auth header in http client ([8ecbace](https://github.com/joe-bor/FamilyHub/commit/8ecbace9deaf43ccd32d40b0330f26bac8200395))
* **app:** update conditional rendering for auth ([474da6f](https://github.com/joe-bor/FamilyHub/commit/474da6ff373f7a5c2f95f92035a4086cfbb32984))
* **auth:** add login flow components ([919fd0f](https://github.com/joe-bor/FamilyHub/commit/919fd0f7a9496f5957764eff78f80b342fbb882c))
* **hooks:** add useDebounce hook ([c11c760](https://github.com/joe-bor/FamilyHub/commit/c11c7603c67be949a71850a669734d7bac51fe63))
* **onboarding:** add credentials step ([3355218](https://github.com/joe-bor/FamilyHub/commit/3355218e42152f1bd30899f4da345f6663a264cd))
* **onboarding:** add error handling to registration mutation ([befe8b9](https://github.com/joe-bor/FamilyHub/commit/befe8b9c9f0153672cd402afa49f2da98ce30f43))
* **onboarding:** add error prop to OnboardingCredentials ([8806a38](https://github.com/joe-bor/FamilyHub/commit/8806a381b79921ae4abf020d2e2f68a957797393))
* **sidebar:** add logout button ([8dacb57](https://github.com/joe-bor/FamilyHub/commit/8dacb57e89e375c0b69ddff181c553e8dea265f4))
* **stores:** add auth store for token hydration ([47e220a](https://github.com/joe-bor/FamilyHub/commit/47e220ab5217740ddfff6f3467ea65ec47f5c263))
* **time-utils:** add getSmartDefaultTimes for visible calendar range ([f2ea03e](https://github.com/joe-bor/FamilyHub/commit/f2ea03ea18e9f7a801e0dfeb2bd6b2da6431c2bc))
* **types:** add auth types and validation schemas ([b7cfe3c](https://github.com/joe-bor/FamilyHub/commit/b7cfe3cc236914b272a8b0a26775d745247c6cc8))


### Bug Fixes

* **api:** add ValidationError type for backend alignment ([55b21fd](https://github.com/joe-bor/FamilyHub/commit/55b21fd57349179556b3d07a5c8e0906e1de81d2))
* **api:** map backend errors array in parseErrorResponse ([bbf66c0](https://github.com/joe-bor/FamilyHub/commit/bbf66c0fbf0ca61a9305b64529a5585dcbbce985))
* **e2e:** reduce test flakiness with robust helpers and config ([575f09b](https://github.com/joe-bor/FamilyHub/commit/575f09b6e047a5cdb7e843c72d5c8167b6540b29))
* **tests:** resolve form submission race condition in CI ([4af35e2](https://github.com/joe-bor/FamilyHub/commit/4af35e2afa5bcb9533fe3f64b4af008b529a0a95))
* **tests:** resolve form submission race condition in CI ([b3f2d90](https://github.com/joe-bor/FamilyHub/commit/b3f2d900990d4eb2ccffb85035f591738e4e7ab8))
* **time-utils:** handle rounding past visible calendar boundary ([0a67cdc](https://github.com/joe-bor/FamilyHub/commit/0a67cdc5e98afdac1d9d3cfe54bf8d1674dec723))
