# Code Generation Plan: harness-contract-and-regression

## Scope

本UnitはU1/U2で確定したcanonical contractを全6 harnessへ投影し、team/human/policy/per-unitの非回帰と生成物driftゼロを固定する。canonical sourceだけを編集し、`dist/`とセルフインストールツリーは生成コマンドだけで同期する(HR-01、NFR-08)。

## Plan

- [x] **Step 1: conductor手順にsolo grant semanticsを記述する**
  canonical `packages/framework/core/amadeus-common/protocols/stage-protocol.md` のgate節へ、route→grant-backed report→typed `await-approval` fallback→prompt-only human reentryの同一sequenceを記述する。carrier pair(`standing_grant_id`/`standing_grant_route_id`)、`target_intent_id`＋`presence_reservation_id`のturn間forward、fallback時のbody/reviewer/sensor/learnings再実行禁止、team/human既存pathの非変更を明記する。
  Trace: FR-25、HR-02–03、business-logic-model § Conductor Workflow Contract。

- [x] **Step 2: host session capabilityをcanonical APIへ集約する**
  `HostSessionCapability = {kind:"available"; sessionId} | {kind:"unavailable"; reason}` と、それを唯一の入力とするpresence mint関数をcore(`amadeus-presence-reservation.ts`)へ置く。core hook `amadeus-mint-presence.ts` をこのAPI経由に置き換える。adapterはraw payloadのunion変換のみを担い、authorizationを持たない。
  Trace: FR-24、HR-04c、HR-08a、logical-components § Import and Failure Boundary。

- [x] **Step 3: 各harness adapterをcanonical APIへ投影する**
  Codex(`harness/codex/hooks/amadeus-codex-adapter.ts`)、Kiro CLI(`harness/kiro/hooks/amadeus-kiro-adapter.ts`)、Kiro IDE(`harness/kiro-ide/hooks/amadeus-kiro-adapter.ts`)のinline mintを共通APIへ差し替え、Cursor(`harness/cursor/hooks/amadeus-cursor-lib.ts`)は`session_id`をcore hookへforwardする。stable identityを持たないharnessは`unavailable`となり、共有key/PID/active cursorへ縮退せずtargeted mutation 0のまま既存HUMAN_TURN挙動を保つ。
  Trace: FR-24、HR-04c–04e、security-design § Harness Capability。

- [x] **Step 4: canonical→6 harness生成とセルフインストール同期を実行する**
  `bun scripts/package.ts` と `bun run promote:self` を実行し、生成物を手編集せずに `dist/claude|codex|cursor|kiro|kiro-ide|opencode` とセルフインストールツリーへ投影する。
  Trace: FR-24、NFR-08、HR-01。

- [x] **Step 5: 全harness contract regression testを追加する**
  6 harness dist tree上でdirective carrier pair、typed `await-approval`(`target_intent_id`/`presence_reservation_id`)、`GATE_AUTHORIZATION_SELECTED` route receipt、grant-backed approval、presence reservation module、conductor protocol記述、mint capability配線をtable-drivenに検証する。
  Trace: FR-24–25、HR-02–04c、HR-15、NFR-07。

- [x] **Step 6: team/human/policy回帰と生成物driftを確定する**
  U2で残っていた `t48-audit-event-emitters` の配布面閉包を含め、team/human baseline suiteを生成後の同一working treeで再実行し、`bun run dist:check` と `bun run promote:self:check` をblockingで通す。
  Trace: FR-24、HR-05–08、HR-19、HR-22、NFR-05、NFR-08。

- [x] **Step 7: 文書化要否を判定して記録する**
  `/amadeus` help、doctor、`docs/reference/12-state-machine.md` を公開契約に照らして判定し、必要な範囲だけ更新する。不要な面は既存出力と矛盾しない根拠を`code-summary.md`へ記録する(frozen PR #1468は参照しない)。
  Trace: FR-26、HR-Documentation Rules、business-logic-model § Documentation Decision Workflow。

- [x] **Step 8: 収束検証とsummaryを完了する**
  生成後の同一working treeで `bun run typecheck`、`bun run lint`、focused suites、`bash tests/run-tests.sh --ci`、`git diff --check` を実行し、command・exit code・件数を`code-summary.md`へ実測記録する。
  Trace: HR-18、HR-22、Completion Evidence、NFR-05–08。

## Explicit Non-goals

- generated harness fileの手編集
- team leader/delegation・既存human approvalの外部観測契約変更
- 未実測の外部host APIに依存する新規harness plugin実装
- session identity欠落時の共有key/PID/active cursorへのfallback
- frozen PR #1468への依存
