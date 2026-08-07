# Requirements — #2297 + #2303 SUBAGENT_STARTED 回復ペア

上流入力(consumes 全数): business-overview、architecture、code-structure

測定 ref: observed = worktree HEAD `5f2ad9195d9ce3ea55d6bf3d34509f2c5ca2c12b`（origin/main 系譜）。行番号はすべてこの断面（クロスレビュー target `75a1c198d` からの SUBAGENT 領域シフトは +14 — RE の区間実測で機械確定、re-scans/260807-subagent-start-pair.md）。

## Intent analysis

Claude Code の `SUBAGENT_STARTED` は live で一切記録されない。原因は独立した2欠陥の重畳であり、**単独修正では 0 件のまま**（両クロスレビューが逆方向まで確認）: (1) #2297 — live `.claude/settings.json` に PreToolUse 配線が無い（drift でなく PR #1924 の片側追加。live は履歴上一度も配線を持たない）。(2) #2303 — `SUBAGENT_DISPATCH_TOOL = "Task"`（amadeus-lib.ts:4128）が live payload の `tool_name: "Agent"` と不一致で、ガード（:4161）が全 dispatch を null に落とす。目標は両欠陥の同時修正による監査 completeness の回復（started/completed 対称性 — codekb business-overview「started/completed 非対称」節）と、同型 drift の再発防止面の新設（live/example/dispatcher 3面の包含破れ2件は codekb architecture「settings 3面と包含破れ」節、live 検査面の構造的不在は codekb code-quality-assessment の同名節に依拠）。

裁定系譜: Issue #2297 / #2303（各クロスレビュー2名成立）→ 本ステージ Q1-Q4（decide-question、auto-decision 4件）。

## Functional requirements

### FR-A: live 配線の回復 — Unit fix-2297-wiring（Q1 = A）

- FR-A1: `packages/framework/harness/claude/hooks/amadeus-dispatch.ts` の `HOOK_PATHS`（:4-15、現10スロット — codekb code-structure「HOOK_PATHS 10スロットと呼出し規約」節に依拠）へ `"log-subagent-start": ".claude/hooks/amadeus-log-subagent-start.ts"` スロットを追加する。対応 hook ファイルは正本 `packages/framework/core/hooks/amadeus-log-subagent-start.ts` に実在（build が self-install 面へ生成 — `ensureCompleteHookTree` :50-57 の部分欠 throw 制約を充足）。
- FR-A2: live `.claude/settings.json` に PreToolUse エントリを既存11件と同じ dispatcher 形で追加する: event `PreToolUse`、matcher `^Task$`（example :62 と同一 — matcher は表示名の名前空間で修正不要とクロスレビュー実測確定）、command は `bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/amadeus-dispatch.ts" log-subagent-start`。
- FR-A3（再発防止 — #2297 完了条件2）: 新規 drift ガードテストを追加する。ground truth は正本 `packages/framework/harness/claude/settings.json.example`（tracked。投影 `.claude/settings.json.example` は untracked 生成物のため基準にしない — codekb code-structure「settings 3面」節の tracked 状態実測に依拠）。正規化キー `(event, matcher, hook script 名)` の3つ組（dispatcher 形は slug → HOOK_PATHS 解決の basename、直接形は command 中の `amadeus-*.ts`）で「example の hook 集合 ⊆ live の hook 集合」の包含を検査する。
- FR-A4（Q2 = A）: FR-A3 のガードは既知欠落 `plugin-compose`（SessionStart）を **Issue 番号参照付きの暫定 allowlist（1件・理由必須）** で容認する。allowlist 解消条件は当該 Issue のクローズ。plugin-compose 欠落自体は本 intent 完了時に Issue-first で起票する（同梱は grant の scope-out 禁止によりユーザー専権 — 本 requirements はスコープ拡大しない）。

受け入れ基準:
- AC-A1: 修正後の live settings に PreToolUse{^Task$}→dispatcher log-subagent-start が1件存在する（検証: FR-A3 ガードテストの包含判定が PreToolUse 行の欠落を検出しなくなること）。
- AC-A2: dispatcher へ未知 slug を渡した場合の fail-closed（parseHookSlug throw → exit 1）が保存される（検証: 既存挙動 — スロット追加が既存スロットの解決を変えないことを FR-A3 テスト実行と既存テスト green で確認）。
- AC-A3（落ちる実証 — Mandated）: FR-A3 ガードは「live から PreToolUse エントリを注入除去した状態」で赤になることを一時注入で実証してから完成扱いにする（falling-proof-injection-one-set — 注入→赤実測→復元→残渣ゼロを1セットで）。
- AC-A4: allowlist は Issue 参照と理由の2フィールドを必須とし、空文字で通過しない（検証: FR-A3 テスト内の負ケース）。

### FR-B: dispatch tool 語彙の両受理 — Unit fix-2303-dispatch-tool（Q3 = A）

- FR-B1: `amadeus-lib.ts:4128` の単数定数を集合定数 `SUBAGENT_DISPATCH_TOOLS`（`["Task", "Agent"]`）へ型変更し、ガード（:4161）を includes 判定へ改める（emit 経路が単一 emitter に収斂する構造と2 payload 形状の収斂は codekb architecture「SUBAGENT_STARTED の単一 emit 鎖」節に依拠）。`tool_name === undefined` の短絡通過（kimi SubagentStart 経路 — :4149-4153 の設計意図 verbatim）は**無改変で保存**する。
- FR-B2: doc-comment（:4160-4172）と `PreToolUse{Task}` 旧語彙コメント（:4149）を新語彙へ書き直す。matcher に関する記述（`^Task$` が内部名 `Agent` payload に発火する非直観）を1行で明記する。
- FR-B3（doc 同期 — #2303 完了条件4 + RE 拡張）: 旧語彙面を全数同期する — `.claude/knowledge/amadeus-shared/audit-format.md:176` と正本 `packages/framework/core/knowledge/amadeus-shared/audit-format.md:176`（+:181 散文）、`docs/reference/12-state-machine.md:400`、`docs/reference/06-hooks-and-tools.md`（:26/:46/:205/:215/:219 のうち **payload の tool_name に関する記述のみ** — matcher 記述は対象外）と `.ja.md` 対訳、`packages/framework/core/hooks/amadeus-log-subagent-start.ts:10-12`。**加えて `docs/reference/23-telemetry-schema.md:194` / `.ja.md:189` の stale cite（:4430/:4456-4457 → 正しくは :4128/:4160-4161 相当の新行）と、同 `:198` の第2 stale cite（`amadeus-lib.ts:4456-4467`）を訂正**する（RE 新規発見 + conductor iteration 1 是正時の直接 grep で :198 を追加検出）。
- FR-B4: `tests/.coverage-registry.json:4250` の `unitId: "function:SUBAGENT_DISPATCH_TOOL"` を集合定数名へ同期する。

受け入れ基準（検証は FR-C のテスト ID に束ねる）:
- AC-B1（欠陥閉包 — 偽 green 封じ）: `tool_name: "Agent"` でフィールドが返る（新規 pin — 現行は null。TDD Red を実測してから実装）。
- AC-B2（後方互換）: `tool_name: "Task"` でも引き続きフィールドが返る（既存15ピン緑維持 — t-subagent-purpose 6 / t454 8 / t-log-subagent-start 1）。
- AC-B3（誤爆防止）: `tool_name: "TaskUpdate"` / `"Write"` は null（既存 pin 維持）。
- AC-B4（kimi 保全）: `tool_name` 不在（SubagentStart 形）はフィールドが返る（既存 pin t-subagent-purpose :82-86 維持）。
- AC-B5: `grep -rn 'PreToolUse{Task}'` が正本・self-install・docs で 0 件（codekb・record の記述面は対象外 — c1-ac-grep-surface-scope）。

### FR-C: 閉包検証（Q4 = A）

- FR-C1: `tests/integration/t-log-subagent-start.integration.test.ts` に `tool_name: "Agent"` の dispatch ケースを追加し、`SUBAGENT_STARTED` 監査行が1行 emit されることを実証する（フック spawn 経路 — 元欠陥への貫通）。既存 `"Task"` ケース（:106）は後方互換 pin として維持。
- FR-C2: 修正後に audit 全数 census（`jq` の `attributes.Event` 等値集計）を再実行し、新規 emit が正当な経路（テスト fixture / 実 dispatch）のみであることを確認・記録する（例外5件の機序未解明への防御 — RE 引き継ぎ事項）。
- FR-C3: 新規テストの tNNN は採番時に tests/ 実測 + PR 発行前再接地で再確認。**t481/t482 は使用禁止**（open PR #2414 と本線で衝突中 — RE 交差判定）。

## Non-functional requirements

- NFR-1: 全ブロッキングゲート green（typecheck / lint / --ci / Project+Patch Coverage / complexity / 隔離2回ビルド / source-only:check / グラフ不変量 / plugin-conformance-e2e）。
- NFR-2: 挙動変更の範囲 — Unit A は live settings + dispatcher スロット追加のみ（既存11エントリの解決不変）、Unit B は subagentStartFields の受理集合拡大のみ（null 側の意味論不変）。
- NFR-3: 新規行は in-process テストで patch coverage を駆動（t-subagent-purpose が正本直 import — spawn 盲点なし）。
- NFR-4: 正本編集は `packages/framework/core/` / `packages/framework/harness/claude/` のみ + live `.claude/settings.json`（tracked live 面は本 intent の患部そのもの）。`bun run build` 後 tracked 差分が意図した編集のみであること。

## Constraints

- self-fix / Minimal depth / Comprehensive test strategy。設計ステージ SKIP のため本書が機構選択まで確定（Q1-Q4）。
- grant intent-grant-cb0b65b381d407d45943784ba517851b の prohibitedEffects: scope-out — plugin-compose 同梱等の拡大禁止（FR-A4 の Issue 化が正規経路）。
- 逸脱は実装前停止（deviation-stop-before-implement）。裁定前提の不成立検知時は再選挙（ruling-premise-closure-verification）。
- Unit A / B はファイル非交差（RE §13）— 並行実装可。ただし emit の閉包（FR-C1）は両 unit の変更が揃った後にのみ green になる（論理依存）。
- worktree 隔離: 本 worktree（2297-2303-subagent-start、base 5f2ad9195）内のみ。**state 系テストのローカル実行は波1の教訓に従い最小限**（env 隔離 seam は marker-below-env で保全済みだが、実行集合は FR-C の対象に限定）。

## Assumptions

- A-1: matcher `^Task$` は表示名の名前空間で照合され修正不要（クロスレビュー3 matcher 同時発火実測）。
- A-2: 例外5件（260805-subagent-type-guard の SUBAGENT_STARTED 5件）の機序は未解明のまま修正に入る — FR-C2 の census 再実測が防御。修正実装が例外の説明を与える発見をした場合は record に記録し、必要なら Issue 化。
- A-3: 併走変更 — open PR #2414（pr-convergence plugin）は患部非交差（RE §12 実測）。
- A-4: `t189-compose-dispatch.sdk.test.ts:78-81` の両語彙受理は SDK ビルド差への既存対応であり、FR-B1 と意味論整合。

## Out of scope

- SessionStart `plugin-compose` の live 配線追加（FR-A4 — Issue-first 起票 + 暫定 allowlist。同梱は scope-out）。
- 例外5件の機序解明そのもの（FR-C2 は防御であり解明ではない）。
- 他ハーネス（kimi/codex/cursor/opencode/kiro）の seam 変更 — kimi は配線済み、他は start seam 非保有の設計（クロスレビュー実測）。
- live 配線の真の end-to-end（実セッション dispatch → 監査行）の自動テスト化 — 構造的に不能（RE §11）。B&T verdict の未検証面として明示し、マージ後の実セッション観測を申し送る。
- `#2279` 系の属性拡充（Type Verdict / Model 等）— 本修正で通り道が開くが対象外。

## Open questions

- なし（未決は Q1-Q4 で確定。plugin-compose の着手判断はユーザー専権として Issue 起票後に委ねる）。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T13:52:55Z
- **Iteration:** 1
- **Scope decision:** none

FR/AC は Q1-Q4 裁定・codekb と高整合、静的 AC に検証手段バインドあり。ただし宣言済み upstream のうち architecture / code-structure の本文内明示参照が欠落 — 是正は軽微で iteration 2 で解消可能。

### Findings

- BLOCKER | requirements.md 本文に宣言 consumes のうち「architecture」「code-structure」の artifact 名明示参照が0件 — 内容は両成果物から導出されているが依拠箇所の名指しがない（artifact-upstream-inputs-header / consumes-first-drafting の実参照要件）
- FOLLOW-UP | FR-B3 の行番号引用（audit-format.md:176 / 06-hooks-and-tools.md :26/:46/:205/:215/:219）はレビュー許可 codekb 断面で裏取り不能 — conductor が当該ファイル直接 grep で確認を（mechanism-cite-verify-at-draft）
- NIT | code-quality-assessment への言及は consumes 宣言外（補助引用として許容だが宣言3artifactの明示参照を優先）

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-07T14:02:30Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER（architecture/code-structure への本文内明示参照欠如）は5箇所の具体的節参照追加で解消。全参照先を実ファイル照合し内容1:1対応を確認。是正差分に新規誤りなし、iteration 1 で健全だった面の後退なし。BLOCKER・FOLLOW-UP なし。

### Findings

- None
