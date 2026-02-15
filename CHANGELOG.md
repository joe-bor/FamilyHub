# Changelog

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
