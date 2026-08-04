# Code Generation Plan — quality-repair-runtime

## スコープと追跡元

U2 `quality-repair-runtime`（Issue #2096）のみを実装する。追跡元は USR-02 / USR-05 / USR-08、FR-QRP-001〜013、FR-LMC-010、FR-STP-003〜006、FR-HAR-001〜007、2096-AC01〜18、および Functional / NFR Design の QRP-A/E/P/R 規則である。テスト戦略は `Comprehensive` とし、決定論的 unit test、production coordinator / replay integration、5 harness projection、package / promote drift を同じ Bolt で閉じる。

U1 `loop-monitor-runtime` の generic Monitor、durable repository、Judge port、latch / resume contract を再利用する。quality の obligation / convergence / route 意味論を generic Monitor へ混入させず、harness 別 Core 分岐も作らない。

## 実装手順

- [x] **Step 1 — generic singleton route constraint seam**: U1 Monitor の compiled route 集合から delivery ごとの非空 subset constraint を検証・予約・Judge request へ伝播できるよう最小拡張する。quality 固有語彙は追加しない。（FR-QRP-009〜011、2096-AC09〜10）
- [x] **Step 2 — first-party contribution と activation**: trusted embedded contribution、descriptor exact resolution、`semi/full` 必須、`none` real-human opt-in / default-off、required outputs 初期空集合を pure contract として実装する。（USR-02 / USR-08、FR-QRP-001〜003 / 012、2096-AC01〜05）
- [x] **Step 3 — blocking evidence normalization**: reviewer / blocking sensor / required produce / verification・completion の closed observation を stable obligation、snapshot、resolved / added / retained、canonical fingerprint へ正規化する。advisory sensor と Request Changes は除外し、不完全 evidence は fail-closed にする。（FR-QRP-004〜008 / 013、2096-AC06〜08）
- [x] **Step 4 — bounded quality convergence**: T+1 window、initial / collecting / strict-progress / threshold、fixed-point / churn / regression / undetermined、replan-first と post-replan repair-stalled singleton constraint を pure reducer として実装する。（USR-05、FR-QRP-009〜011、2096-AC09〜11）
- [x] **Step 5 — durable production coordinator**: canonical quality event set、snapshot / progress / replan reservation-before-effect、closed attempt 0/1、local review cycle、generic Monitor delivery / Judge / latch、`REPAIR_STALLED` / suspended status を統合する。（FR-STP-003〜006、2096-AC10〜15）
- [x] **Step 6 — resume / replay / status**: `any-of[evidence-change,human-retry]`、atomic latch clear + new quality epoch + workflow unpark、same-fingerprint short circuit、cross-session replay と safe status envelope を実装する。（USR-05、FR-LMC-010、2096-AC11〜16）
- [x] **Step 7 — Comprehensive tests**: Step 1〜6 の red unit / integration testsを追加し、T-1 Judge 0、初回 T replan、strict progress reset、replan 後 T stalled、Request Changes 非変換、crash / replay / duplicate / cross-scope、latch / resume contract 再利用を検証する。（2096-AC01〜18）
- [x] **Step 8 — 5 harness projection と品質ゲート**: framework core から Claude Code / Codex / Cursor / OpenCode / Kimi Code へ生成し、共通 fixture の byte-equivalent contract、`bun run typecheck`、`bun run lint`、focused tests、`bun scripts/package.ts --check`、`bun run promote:self:check` を検証する。（FR-HAR-001〜007、2096-AC16〜18）

## 非対象

U3〜U5、Intent grant、gate / question 認可、PR / merge、外部 runner / supervisor、Kiro live、外部 Plugin manifest、新 stage、固定総 retry cap、新規 mandatory artifact は実装しない。
