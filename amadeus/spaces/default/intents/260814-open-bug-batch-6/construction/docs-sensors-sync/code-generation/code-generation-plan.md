# Code Generation Plan — U-3 docs-sensors-sync(#3028 / FR-3)

depth Minimal。D-3 (b) の実装。U-2(#3086)着地後の main から分岐(bolt-docs-sensors-sync)、push-first。トレース: 全 step → FR-3。

## Steps

- [x] Step 1: 実在集合の導出述語を確定 — 「core `packages/framework/core/sensors/*.md` + 各 plugin.json が宣言する sensors」の合成集合(件数フリー契約)。U-2 着地後の期待値 14 を実測で確認 → FR-3 (1)
- [x] Step 2: TDD Red — 既存 docs 検証テスト様式に従い、06-sensors(.ja).md の表の行集合が導出集合と一致することを検査するテストを追加し、現状(表10行)で Red を実測 → FR-3 (3)
- [x] Step 3: en/ja 表を同期(4行追加: nfr-budget / question-budget / scope-sizing / git-drift。model-completeness 行は保持しプラグイン由来注記を追加)→ Green。`grep -c '^| \`amadeus-'` = 14 を en/ja 両方で実測 → FR-3 (1)(2)
- [x] Step 4: 落ちる実証 — 表から1行を一時除去 → 検査赤 → revert 残渣ゼロ
- [x] Step 5: coverage-registry regen(必要時)、typecheck / lint / 対象テスト green、コミット
- [x] Step 6: record 配送 PR・report mint・code-summary

## テスト方針(Comprehensive)

件数フリー契約(表 ⊆⊇ 導出集合)により将来のセンサー増減へ自動追随。en/ja 同数もテスト内で検査。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T04:48:02Z
- **Iteration:** 2
- **Scope decision:** none

前回 BLOCKER(report の head 乖離)は解消 — report の pr head と gh pr view 3092 --json headRefOid がともに ad60b8afa06cb27b33813d8eaea26d0bb242aff4 で一致し、FR-3 (1)(2)(3) は配送先ツリー(PR head)で全て再現。新規 BLOCKER なし、FOLLOW-UP 4 件と NIT 1 件。

### Findings

- FOLLOW-UP | cid:code-generation:c1-mirror-and-rebuild-before-review の取込順序が未充足 — conductor ツリー(HEAD a49f9e9fdbd19fd40e9374feba77e9360771d173)には本 Bolt が未取込で、docs/harness-engineering/06-sensors.md / .ja.md はいずれも grep -c '^| `amadeus-' = 10、tests/integration/t3028-sensors-docs-sync.integration.test.ts は不在。ただし成果物の申告実測は配送先ツリー(PR head ad60b8afa)で全て再現できたため(en/ja とも 14 行、テストファイル実在)、規範が防ごうとした再現不能は発生していない。PR #3092 は merge queue 投入済みで head 更新不可のため本 Bolt では順序を回復できず、取込は queue のマージが担う。マージ後に conductor ツリーへ main を取り込み bun run build を実行して配送先述語で再実測してから record checkpoint を閉じること。
- FOLLOW-UP | code-summary.md:5 の見出しは変更ファイル一覧を「PR #3092 の gh pr diff --name-only 対象」と provenance 付きで宣言するが、実測した gh pr diff --name-only 3092 の 8 パスのうち amadeus/spaces/default/intents/260814-open-bug-batch-6/audit/j5ik2o-mac-studio-lan-867742863370.jsonl が列挙から欠けており、完全性を主張する列挙が実際の集合と一致していない。監査シャードの同梱自体は checkpoint 運用として正当なので、列挙側に1行足すか見出しの主張を「コード面の変更ファイル」へ限定するかのいずれかで整合させる。
- FOLLOW-UP | 上流 unit-of-work.md の U-3 節(所有ファイル行)は依然「既存 docs 検証テストへの追加」と記しており、新規ファイル tests/integration/t3028-sensors-docs-sync.integration.test.ts での実装と字面が食い違う。逸脱自体は decisions.md D-3 の追補(選挙 E-260815-U3-NEWFILE-DEVIATION 2-0 ESTABLISHED)で裁定済みのため無申告の逸脱ではないが、D-3 のみ精密化され U-3 が未同期のまま残っている。追補と同じ精密化を U-3 の所有ファイル行へも反映すること。
- FOLLOW-UP | attested context が述べる 07-sensor-system の同類 drift は「別起票予定」の段階に留まり、起票済みの Issue 番号が record のどこにも残っていない。FR-3 の射程が 06-sensors のみであることは requirements.md FR-3 の実文と一致するため本ステージの受け入れには影響しないが、予定のままではノルムの潜在バグ探索(実測だけを起票)が閉じない。ゲート閉包までに起票して Issue 番号を record へ記録すること。
- NIT | code-summary.md:8 の「実 filesystem 走査のため integration tier / size: medium — integration tier / size: medium 注釈で size purity ゲートに適合」と implementation-notes.md:8 の「(実 filesystem 走査のため integration tier / size: medium。§12a 指摘による移設 — size purity ゲート適合(integration tier / size: medium))」は、いずれも同一の tier / size 表記を1文中で二重に述べている。是正時の追記が既存文と重なったもので、事実誤りではないが冗長。片方へ寄せると読み手が移設の経緯と現状を一度で追える。
