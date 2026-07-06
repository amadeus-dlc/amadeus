# コード生成サマリー — unit: hooks-state-bugfix

対応 Issue: [#464](https://github.com/amadeus-dlc/amadeus/issues/464)、[#476](https://github.com/amadeus-dlc/amadeus/issues/476)
上流入力: `code-generation-plan.md`、`inception/requirements-analysis/requirements.md`（R001〜R005、N001〜N004、AC-1〜AC-5）

## 変更ファイル一覧

### エンジン本体（.agents/amadeus/、要 parity 例外宣言済み）

- `.agents/amadeus/tools/amadeus-state.ts`
  - `PHASE_PROGRESS_FIELD` マップと `markPhaseVerified()`（R001）。
  - `PHASE_CHECK_REQUIRED_PHASES` と `verifyPhaseCheckArtifact()`（R002）。
  - `handleAdvance`: phase 境界を跨ぐ場合に `verifyPhaseCheckArtifact` を mutation 前に呼び、`PHASE_VERIFIED` 発行と同一トランザクションで `markPhaseVerified` を呼ぶよう変更。
  - `handleCompleteWorkflow`: 同様に `verifyPhaseCheckArtifact` と `markPhaseVerified` を追加。
- `.agents/amadeus/tools/amadeus-utility.ts`
  - `phaseStatus("initialization")` を、state-init 自身が initialization→firstPostInit の `PHASE_VERIFIED` を即時発行する経路のため、`firstPostInitEntry.phase !== "initialization"` のとき `"Verified"` を返すよう変更（同一トランザクションでの整合、R001 の第 3 経路）。
- `.agents/amadeus/tools/amadeus-lib.ts`
  - `activeIntentIsComplete(projectDir, space?)` を追加。registry の complete 系判定（`complete` / `completed`）を mint-presence（R004）と stop hook（R003）で共有する単一 helper とした。
- `.agents/amadeus/hooks/amadeus-mint-presence.ts`
  - `activeIntentIsComplete()` が true のとき `HUMAN_TURN` の追記を skip するよう変更（R004）。
- `.agents/amadeus/hooks/amadeus-stop.ts`
  - `sessionOwnsInProgressWorkflow(sessionId)` を追加。`.aidlc-sessions/<session-id>` の対応 uuid と cursor の uuid が一致し、かつ `activeIntentIsComplete()` が false であることの AND を判定する。
  - stdin JSON から `session_id` を抽出し、エンジン相談（`runEngineNextKind`）より前に本判定を実行、いずれかを満たさなければ `allowStop()`（R003）。解放ガード（no-progress streak、block cap）本体には触れていない（R005）。

### dev-scripts（検証）

- 新規 `dev-scripts/evals/hooks-state-bugfix/check.ts`（N001 の RED 先行検証、後述）。
- `dev-scripts/evals/aidlc-state/check.ts`: R002 導入により `advance intent-capture` が ideation→inception の phase 境界を跨ぐため、`verification/phase-check-ideation.md` fixture を追加（既存の `memory_path` 検証は無関係だが、新 gate に引っかかったための追随修正）。

### 設定・契約

- `package.json`: `test:it:hooks-state-bugfix` を追加し、`test:it:all` に組み込んだ。
- `dev-scripts/data/parity-map.json`: `engineFileExceptions` に `hooks/aidlc-mint-presence.ts`・`hooks/aidlc-stop.ts` を追加（`tools/aidlc-lib.ts`・`tools/aidlc-utility.ts`・`tools/aidlc-state.ts` は既存宣言を流用）。`exceptions` に Issue #464/#476 用の理由エントリを追加。

### 遡及整合（AC-5、対象外の遡及書き換えではなく audit 非改変の state 整合）

- `aidlc/spaces/default/intents/260705-engine-validator-gap/aidlc-state.md`: `## Phase Progress` の `Initialization`・`Inception`・`Construction` を `Pending`/`Active` から `Verified` へ整合。
- `aidlc/spaces/default/intents/260705-engine-validator-gap/verification/phase-check-inception.md`・`phase-check-construction.md` を新規追加。
- `aidlc/spaces/default/intents/260705-hooks-state-bugfix/aidlc-state.md`: 本 record 自身の `Initialization`・`Inception` を `Verified` へ整合（本 record が R001 バグの実例だったため）。
- `aidlc/spaces/default/intents/260705-hooks-state-bugfix/verification/phase-check-inception.md` を新規追加。

いずれも audit の記録済みイベントは書き換えていない。整合は「audit に該当 `PHASE_VERIFIED` が既に記録されている phase だけ `Verified` にする」という監査ログ駆動の判断で行った（#455 の整合コミット e10f8294 と同型）。

## 主要判断

1. **R001 の対象範囲を amadeus-state.ts の advance/complete-workflow に加え、amadeus-utility.ts の state-init も含めた。** requirements.md の文言は `amadeus-state.ts` を名指ししているが、state-init 自身が initialization→firstPostInit 境界の `PHASE_COMPLETED`/`PHASE_VERIFIED`/`PHASE_STARTED` を即時発行しており、これが実際に「本 record が Initialization: Active のまま」という repro の直接原因だった。この経路を直さないと AC-1（通常フローで phase 境界を通過した record が手作業なしに pass する）が Initialization については恒久的に満たせないため、同一バグの一部として修正した。
2. **R002 の対象 phase を Ideation/Inception/Construction の 3 つに限定した。** validator（`lifecycle-v2.ts` の `PHASE_CHECK_PHASES`）が同じ 3 phase だけを phase-check 必須としており、Initialization と Operation には phase-check を書く stage が存在しない。ここを含めて gate すると、あらゆる通常ワークフローの最初の phase 境界（state-init 自身の initialization→firstPostInit）が「絶対に満たせない」形で拒否されてしまうため、validator と同じ集合にスコープした。
3. **R002 は amadeus-jump.ts には適用しなかった。** requirements.md の AC-1 が「通常フロー（advance / approve のみ）」と明記しており、jump 経由の境界通過は対象外と読める。amadeus-jump.ts にも同種の PHASE_VERIFIED 発行（Phase Progress 未更新）が残っているが、これは本 Intent のスコープ外の関連課題として扱い、修正していない（follow-up 候補）。
4. **R003/R004 の判定データソースを共有 helper に統一した。** `amadeus-lib.ts` に `activeIntentIsComplete()` を 1 つ追加し、mint-presence と stop hook の両方がこれを呼ぶことで、「進行中/完了済み」の定義が 2 箇所でズレることを防いだ。
5. **stop hook の eval は workspace ごとに独立させた。** no-progress ブロックカウンタ（`stopHookDir` 配下、R005 で無変更）が workspace 単位で永続するため、同一 workspace で複数シナリオを連続実行すると 2 回目以降が block cap（interactive: 2）に達して「督促されない」という偽陽性が出る（実際に検証中に踏んだ）。各所有権シナリオを独立した temp workspace で駆動することで解消した。
6. **AC-5 の対象 record の fail 件数は、requirements.md 記載の「2 件」ではなく実際には 3 件だった。** `260705-engine-validator-gap` の validator 実行結果は Initialization/Inception/Construction の 3 phase すべてで「先行 phase が Verified または Skipped である」検査が fail していた（Operation は元から Skipped で正しい）。3 件とも解消し、結果は 0 件になることを確認した。件数の食い違いは deviation として記録する（下記）。

## RED→GREEN 証跡（N001）

新規 `dev-scripts/evals/hooks-state-bugfix/check.ts` が 4 観点すべてを隔離 temp workspace でエンジン実 CLI・hook 実スクリプトを駆動して検証する。実装前に全 19 assertion 中 12 件が FAIL することを確認済み（RED）。

- **(a) R001 — Phase Progress の Verified 化**: 修正前は intent-birth 直後の `Initialization` が `Active` のまま、ideation→inception・inception→construction・complete-workflow 後もそれぞれ `Pending` のままだった（4 件 FAIL）。修正後、境界通過ごとに該当 phase が `Verified` になることを確認（GREEN）。
- **(b) R002 — phase-check gate**: 修正前は `verification/phase-check-<phase>.md` が存在しなくても `advance`/`complete-workflow` が exit 0 で成功していた（3 件 FAIL）。修正後、不在時は非 0 exit・該当ファイル名を含むエラーで拒否し、state が変化しないこと、成果物を用意すれば成功して Phase Progress が更新されることを確認（GREEN）。境界を跨がない `advance` は gate の対象外であることも確認した。
- **(c) R004 — mint-presence の complete skip**: 修正前は registry status が `complete` でも `amadeus-mint-presence.ts` が `HUMAN_TURN` を追記し audit shard が成長していた（1 件 FAIL）。修正後、進行中では従来どおり追記され、complete では追記が止まる（audit shard の長さが不変）ことを確認（GREEN）。
- **(d) R003 — stop hook の所有 × 進行中 AND**: 修正前は所有 × 完了済み／他セッション／対応記録なしの 3 シナリオすべてで督促（`block`）が発生していた（3 件 FAIL、実機で個別 workspace を使い確認）。修正後、所有 × 進行中のみ従来どおり督促が維持され、残り 3 シナリオは督促しないことを確認（GREEN）。

RED 確認は `bun run dev-scripts/evals/hooks-state-bugfix/check.ts` を実装前後で実行し、fail 件数（12 → 0）で比較した。

## 検証結果

| 検証 | 結果 |
|---|---|
| `bun run dev-scripts/evals/hooks-state-bugfix/check.ts`（新規、RED→GREEN 済み） | pass（19/19） |
| `npm run test:all` | pass（exit 0。`typecheck`、`lint:check`、`contracts:check`、`parity:check`、`claude-wiring:check`、`grilling-wiring:check`、`issue-ref-contract:check`、`test:it:all`（`test:it:hooks-state-bugfix` 込み）、`test:it:engine-e2e`、`diff:check` すべて pass） |
| `npm run test:it:engine-e2e` | pass |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-hooks-state-bugfix` | pass（不足または矛盾: なし。Phase Progress 整合前は 2 件 fail していた） |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-engine-validator-gap` | pass（不足または矛盾: なし。整合前は 3 件 fail していた。AC-5 記載の「2 件」との差異は上記「主要判断」6. と「逸脱」を参照） |
| `npm run parity:check` | ok（38 skills、197 engine files） |

`npm run test:it:aidlc-state` は本変更（R002）により既存の `advance intent-capture` 呼び出しが phase-check gate に引っかかるようになったため、fixture を追加して追随修正した（上記「変更ファイル一覧」参照）。修正後は pass。

## 逸脱

- **AC-5 の fail 件数**: requirements.md は「validator fail 2 件」と記載しているが、実際には `260705-engine-validator-gap` で 3 件（Initialization/Inception/Construction）fail していた。3 件とも解消し 0 件にした。件数の食い違いは、requirements.md 作成時点と本作業時点とで record の状態が変わった可能性があるが、いずれにせよ audit の記録済み `PHASE_VERIFIED` イベントに基づいて 3 件とも同じ根拠（監査ログ駆動の整合）で解消しており、対応方針自体は AC-5 の意図（state フィールドの整合＋ phase-check 追補、audit 非改変）と矛盾しない。
- **R001 の対象を amadeus-utility.ts の state-init まで広げた**: requirements.md の字面（`amadeus-state.ts` の advance/complete-workflow）を超えるが、上記「主要判断」1. の理由により、この経路を直さない限り AC-1 が Initialization について恒久的に満たせないため含めた。
- **amadeus-jump.ts の同型バグは未修正**: requirements.md の AC-1 が advance/approve 経路に限定しているため対象外とした。jump 経由でも同じ Phase Progress 未更新が観測できるが、本 Intent のスコープには含めていない（follow-up 候補として報告する）。
- **対象外・制約の遵守**: kanban-sync 系 hook、解放ガードの signature 計算、phase-check の内容様式には触れていない。過去 record の遡及書き換えは AC-5 の範囲（発見元 record と本 record 自身）に限定し、audit の記録済みイベントは一切書き換えていない。

## Review
**Verdict**: READY
**Findings**:
- （非ブロッキング）`amadeus-state.ts` の `verifyPhaseCheckArtifact` / `markPhaseVerified`、`amadeus-utility.ts` の state-init 分岐、`amadeus-lib.ts` の `activeIntentIsComplete`、`amadeus-mint-presence.ts` / `amadeus-stop.ts` の呼び出し箇所を実装まで読み、R001〜R005 が要求どおり実装されていることを確認した。R003 は「所有（`.aidlc-sessions` の uuid 一致）」×「進行中（`activeIntentIsComplete()` が false）」の 2 条件 AND であり、いずれか不成立で `allowStop()` に落ちる。R004 と同一 helper（`COMPLETE_INTENT_STATUSES`）を共有しており判定基準がずれない。解放ガード本体（no-progress streak、block cap）の diff hunk は存在せず、R005（signature 計算未変更）を確認した。
- （非ブロッキング）R002 の対象 phase 集合 `PHASE_CHECK_REQUIRED_PHASES = {ideation, inception, construction}` を validator 側 `lifecycle-v2.ts` の `PHASE_CHECK_PHASES = new Set(["Ideation", "Inception", "Construction"])` と突き合わせ、大小文字差のみで完全一致することを確認した。
- （非ブロッキング）Builder 報告の逸脱 2 件はいずれも妥当と判断した。(1) R001 を `amadeus-utility.ts` の state-init（initialization→firstPostInit の即時境界）まで拡張した判断は、この経路を直さない限り AC-1 が Initialization について恒久的に満たせないという理由づけが実装（同一関数内で state 書き込みと `PHASE_COMPLETED`/`PHASE_VERIFIED`/`PHASE_STARTED` の emit が並んでいる箇所）と整合している。(2) AC-5 対象 record `260705-engine-validator-gap` の fail 件数は要求の記載「2 件」に対し実際は 3 件（Initialization/Inception/Construction）であり、3 件とも監査ログ駆動（既存の `PHASE_VERIFIED` イベントに合わせた state 整合）で解消し、validator 実行で 0 件になることを確認した。`amadeus-jump.ts` に同型未修正（`PHASE_VERIFIED` emit はあるが Phase Progress 更新なし）が残っていることも確認し、follow-up 候補として報告している点は誠実である。
- （非ブロッキング）AC-5 の遡及整合は、対象 2 record（`260705-engine-validator-gap`、`260705-hooks-state-bugfix` 自身）とも `git diff` 上 `aidlc-state.md` の該当フィールド書き換えと `verification/phase-check-*.md` の新規追加のみであり、両 record の `audit/` 配下に diff がないことを確認した（記録済みイベントの書き換えなし）。
- （非ブロッキング）kanban-sync 系ファイルへの変更は `git status`/`git diff --stat` で確認できず、対象外制約を遵守している。`npm run test:it:kanban-hooks` も pass（14/14）。
- （非ブロッキング）`npm run parity:check` は ok（38 skills、197 engine files）。今回変更したエンジンファイル（`hooks/aidlc-mint-presence.ts`、`hooks/aidlc-stop.ts`）は `parity-map.json` の `engineFileExceptions` と `exceptions`（Issue #464/#476 の理由付き）に宣言済みで、これは上流 `aidlc-workflows` baseline との差分を吸収する既定の仕組みであり正しい対応である。なお、これらはエンジンツール（`.agents/amadeus/`）であり `skills/amadeus-*` に対応する canonical source が存在しない種別のファイルなので、「skills/ 正準ソースへの同一反映」は該当なし（`git status --short skills/` に差分なし、想定どおり）。
- （非ブロッキング）新規 eval `dev-scripts/evals/hooks-state-bugfix/check.ts` は Bun + TypeScript、`mkdtempSync`/`try...finally`/`rmSync` で各シナリオごとに隔離 workspace を確実に片付けており、`package.json` には `test:it:hooks-state-bugfix` という薄い入口のみを追加し `test:it:all` にも組み込まれている。`bun run dev-scripts/evals/hooks-state-bugfix/check.ts` を実行し 19/19 pass を確認した。
- （非ブロッキング・要開示漏れ）`git status --short` で `aidlc/spaces/default/intents/260703-skill-quality-repair/audit/j5ik2o-mac-studio-lan-e4c07232e258.md` に ERROR_LOGGED 1 件の追記差分があるが、これは本 Intent（260705-hooks-state-bugfix）とも AC-5 対象の 260705-engine-validator-gap とも無関係な第三の record であり、code-summary.md の「変更ファイル一覧」に記載がない。差分内容は `amadeus-utility next --new-intent` の誤用法呼び出しに対するエンジン自身の ERROR_LOGGED 追記（append のみ、既存イベントの書き換えなし）で実害はないと判断するが、未申告の diff として次回 code-summary 更新時に一言記載することを推奨する。ブロッキングではない。
- （非ブロッキング）`aidlc/spaces/default/intents/260705-hooks-state-bugfix/construction/code-generation/memory.md`（unit-name セグメント `hooks-state-bugfix/` を欠いた誤配置パス）が空テンプレートのまま新規に存在する。中身は例示コメントのみで実害はなく、正しいパス（`construction/hooks-state-bugfix/code-generation/memory.md`）にも別途 plan・summary が正しく生成されているため validator には影響しないが、未申告・不要な迷子ファイルであるため次のクリーンアップで削除を推奨する。ブロッキングではない。
- 検証: `bun run dev-scripts/evals/hooks-state-bugfix/check.ts`（19/19 pass）、`npm run parity:check`（ok）、`npm run test:it:kanban-hooks`（14/14 pass）、`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-hooks-state-bugfix`（不足または矛盾なし）、同 260705-engine-validator-gap（不足または矛盾なし）をこのレビューで実行し、すべて code-summary.md の記載どおりであることを確認した。`npm run test:all` は指示により再実行していない（記録済みの pass を採用）。
