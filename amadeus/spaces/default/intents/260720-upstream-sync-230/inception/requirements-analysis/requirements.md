# Requirements — upstream-sync-230

> 上流入力(consumes 全数): intent-statement.md、scope-document.md、business-overview.md、architecture.md、code-structure.md、team-practices.md

> 基準: upstream `awslabs/aidlc-workflows` v2.2.0（`eae912e09c42627fe51a0f1c26e0d2fc2d7e3bd4`）→ v2.3.0（`29a31f7899731b53f2b8d7f76cd223f9a8a25859`）、Amadeus observed `545e69c836d46f7bec2fa351c8e668026eb5fad5`。同日 RE 判定は MISSING 19 / PARTIAL 4 / EQUIVALENT候補 1。

## Intent 分析

本 intent の目的は upstream のコードをそのまま複製することではなく、承認済み24 ADOPT/ADAPT項目の**利用者可視契約**を Amadeus の one-core-many-harnesses 構造へ適応し、既知の無音 degrade と拡張負債を封鎖することである。対象利用者は Amadeus 開発チーム、6ハーネス利用者、将来の plugin 作者。成功は機能の存在だけでなく、非active plugin時の byte-identical、6面投影、fail-closed、回帰テスト、生成物同期、ledger 遷移で判定する。

質問0問の根拠は requirements-analysis-questions.md の E-OC1 承認（2026-07-20T07:27:22Z）。未決の物理分割、seam、代替案は application-design へ委譲し、承認済み仕様をこの段階で増減しない。

## 機能要件

### FR-0: disposition と検証先行

- 24項目を安定 ID で追跡し、MISSING / PARTIAL は不足契約だけを実装する。
- `swarm-batch-advance`、`gate-next-stage-naming`、`help-routing`、`kiro-ide-hook-context` は Construction 着手前に現行挙動を回帰テストで固定する。upstream 契約と同等なら EQUIVALENT として実装差分を作らず、非同等の不足だけを ADAPT する。
- 受け入れ基準:
  - Given observed `545e69c…` の現行コード、When 4項目の成功・失敗経路を実行、Then 各項目に EQUIVALENT / PARTIAL / MISSING の反証可能な verdict とテスト証跡が残る。
  - Given EQUIVALENT verdict、When Construction scope を生成、Then 当該項目の挙動変更は含まれず、回帰テストと根拠だけが残る。

### FR-1: エンジン正しさ（items 1–6）

1. **bolt-dag-selfheal:** runtime graph の `bolt_dag` が欠落・陳腐化した場合、unit dependency 正本から再計算し、coverage 判定も再計算後の unit 集合を使う。再計算不能時は無音の非Unitループへ降格せず loud failure とする。
2. **gate-revision-backstop:** reject/revise が記録されないまま approve へ到達した場合、approve 前に Revision Count と回復済み `GATE_REJECTED` / `STAGE_REVISING` を一度だけ補完する。既存の engine-opened gate 回復と二重記録しない。
3. **swarm-batch-advance:** 全 Bolt DAG batch の未完了分を順に選び、current run の converged だけを参照し、merge failure を converged と記録しない。FR-0 の検証で既存同等なら変更しない。
4. **help-routing:** help 形入力は全入口で help へ routing し、`help` を intent record 名として予約拒否し、未知 intent は候補を捏造せず安全なエラーを返す。
5. **compose-pending-freshness:** compose-pending marker は24時間以内だけ有効とし、期限切れは stop carve-out に使わない。doctor が stale marker と修復方法を表示する。
6. **recompose-autonomy-guard:** autonomous Construction 中の recompose を state mutation 前に拒否し、既存 plan/runtime graph を不変に保つ。
- 受け入れ基準: 各6項目に正常系と失敗系の自動テストを置き、自己修復は再実行して冪等、拒否系は state/audit/marker に部分書込み0、swarm merge failure は converged 0であること。

### FR-2: エンジン機能（items 7–10）

7. **unit-kind-pruning:** Unit の `kind` と stage の `produces_kinds` を schema/graph/directive/sensor が同じ closed vocabulary で解釈し、該当しない per-unit design artifact を要求しない。未知 kind は fail-closed。
8. **unit-major-iteration:** opt-in `Construction Iteration: unit-major` と state verb を追加し、Unit単位の工程順を決定的に歩く。未指定時の既存 stage-major 順と生成 bytes は不変。
9. **scope-cost-preview:** scope confirmation、intent birth、scope-change、validate-grid が同じ compiled grid 由来の stage数・gate数を表示し、JSON 出力には additive な `summary` を持たせる。
10. **gate-next-stage-naming:** gate directive の `next_stage` は実際の次の in-scope stage を示し、SKIP stage 名を表示しない。終端では次 stage がないことを明示する。
- 受け入れ基準: default backward-compatibility fixture が byte-identical、unknown kind/不正 iteration は mutation 前 reject、全 scope の preview count と compiled grid count が一致、gate の表示名と次の engine directive が一致すること。

### FR-3: workspace 検出（items 11–12）

11. **nested-root-detection:** 直下に project signal がない場合のみ depth-1 を走査し、nested project を Brownfield と判定して `Nested Root` を audit/detect JSON に記録する。複数候補・読取不能は決定的な advisory とし、勝手に一つを選ばない。
12. **submodule-detection:** `.gitmodules` を brownfield signal に含め、未初期化 submodule を birth / doctor / detect で advisory 表示する。submodule がない workspace の出力は不変。
- 受け入れ基準: empty、単一nested、複数nested、初期化済み/未初期化submodule、permission failure の fixture を持ち、誤って Greenfield scaffold を上書きしないこと。

### FR-4: ハーネス統合（items 13–15）

13. **execpath-spawn:** hook adapter の Bun 再起動は bare `bun` でなく `process.execPath` を使い、PATH に bun がない環境でも動く。対象は6ハーネスの該当 spawn site 全数。
14. **kiro-ide-hook-context:** Kiro IDE は `USER_PROMPT`、audit-tail、payload有無、agent identity、tool failure を IDE 契約どおり分類し、stdin race に依存しない。debug log はopt-inで、通常出力を汚さない。
15. **project-dir-quoting:** shipped Claude settings の `$CLAUDE_PROJECT_DIR` は全 hook command で double quote され、空白を含む絶対pathでも同じ11 hookが起動する。
- 受け入れ基準: PATH除去、空白入りproject path、payload-free hook、failed tool、subagent identity の fixture が成功し、未引用・bare bun・2秒stdin raceの再導入を全数grep/構造テストで検知すること。

### FR-5: reviewer品質（items 16–17）

16. **reviewer-date-persona:** Review の日付は実行時の `date -u` 出力から取得し、reviewer persona/identity を先頭行に明示する。モデル推定日付を使わない。
17. **reviewer-read-scope:** per-unit reviewer は対象Unit成果物と directive.consumes の共有契約だけを読み、他Unitの実装・diary・planを無差別に読まない。必要な追加読取は理由付きで明示する。
- 受け入れ基準: reviewer template/persona/protocol/全6投影に同じ契約が存在し、固定日付文字列や全record再帰読取の指示が0件、許可読取集合のfixtureが境界外パスを拒否すること。

### FR-6: plugin機構（items 18–22）

18. **stage-schema-extensions:** stage schema は `number`、`name`、`bundle`、`when`、`required_sections` と Unit kind 関連fieldを型付きで受理・正規化する。`when` は保存するが、本 intent では評価を実装せず deferred と表示する。未知field/不正型はfail-closed。
19. **packager-plugin-projection:** `plugins/<name>/` を発見し、source・host projection・`dist/plugins/` の所有境界を保って6ハーネスへ投影する。byte/orphan/unreferenced driftを検査し、手編集distを正としない。self-install は既存closed listの4面だけを対象にする。
20. **plugin-compose-hook:** no-clobber stage copy、`produces` / `consumes` / `sensors` / `required_sections` のseam merge、宣言済みfragment splice、runtime graph self-heal compile、drop record、doctor可視化を決定的に行う。衝突・malformed plugin・部分適用はloud failureとし、既存stageを半端に変更しない。
21. **test-pro-reference-plugin:** `plugins/test-pro/` を最小reference pluginとして用意し、authoring sourceから6ハーネス投影、compose、doctor、dropまでを一つのintegration fixtureで実証する。
22. **plugin-docs:** Amadeus path/namespaceで利用者向けreferenceとauthoring guideを提供し、対応面・deferred面・no-clobber・検証手順・6/4ハーネス差を記載する。
- 受け入れ基準:
  - Given plugin 0件、When package/compile、Then core・既存6 harness出力はbaselineとbyte-identical。
  - Given test-pro 1件、When temp dirへbuild→compose→doctor→drop、Then宣言成果物だけが生成・検出・除去され、tracked treeへ一時生成物を残さない。
  - Given同名stage/不正manifest/未知seam、When compose、Then既存bytes不変で非0終了し、理由をdrop/audit/doctorの適切な面へ残す。

### FR-7: テストとdocs（items 23–24）

23. **ported-tests:** upstream t199–t219とt188が検証する採用契約を Amadeus のunit/integration/e2e層へ再著作する。filesystemを触る検査はintegration-firstとし、SKIP項目のテストを持ち込まない。
24. **docs-updates:** 採用機能のreference/guide/harness-engineering文書を英語正本・日本語pair規約に従って更新し、Amadeus固有path、6 harness、生成/手編集境界を使う。手書きCHANGELOG、roadmap.html、upstream READMEコピーは作らない。
- 受け入れ基準: 各FR item IDが最低1つの自動テストまたは明示的docs検査へtraceし、legacy path/aidlc namespace/片面翻訳欠落が既存gateで0件。

### FR-8: ledger と完了状態

- 実装開始時は upstream-sync ledger を `INTENT_IN_PROGRESS`、24項目と全検証の成功後だけ `APPLIED` とし、最終Amadeus比較SHAを記録する。
- 途中失敗・放棄は `BLOCKED` と反証可能な根拠を記録し、比較baselineを前進させない。
- 受け入れ基準: APPLIED遷移は24項目disposition、必須gate全green、最終SHAの3条件を欠くと拒否され、再実行して二重履歴を作らないこと。

## 非機能要件

- **NFR-1 決定性:** 同一source/plugin/scope/stateから schema正規化、graph、projection、compose、count、record が同一bytesを生成する。
- **NFR-2 fail-closed / atomicity:** malformed入力、衝突、未知kind、部分write、merge failureを成功へ読み替えない。書込処理は失敗時に既存正本・生成物・stateを不変にする。
- **NFR-3 互換性:** plugin非active、unit-major未指定、新signal不在の既定経路は現行の公開出力とbyte-identical。要求されない互換shimや二重実装は追加しない。
- **NFR-4 配布整合:** canonicalは `packages/framework/core/` と `packages/framework/harness/<name>/`。6 harness distと4 harness self-installを混同せず、生成物は正本と同一commitで同期する。
- **NFR-5 検証:** 項目別targeted testsに加え `bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci` を全てexit 0にする。RE時のtypecheck exit 127と未実施full testsは成功証拠に流用しない。
- **NFR-6 coverage:** push前local lcovでpatch追加行の未カバー0。spawn blind spotはin-process seamで検証し、waiverは既決条件を満たす場合だけ使う。
- **NFR-7 保守性:** 巨大既存fileへ新しい横断abstractionを先行導入せず、schema/packager/adapterの既存choke pointへ最小変更する。adapterや公開slotだけのdormant先行着地は禁止。
- **NFR-8 セキュリティ/供給網:** 配布frameworkへ新runtime dependencyを追加せず、upstream sourceは検査対象として扱い実行しない。credential/secret/network送信面を新設しない。

## 制約

| ID | 制約 |
|---|---|
| C-1 | Bun-only。配布frameworkへ文書化なきruntime dependencyを追加しない（constraint-register T1）。 |
| C-2 | `dist/`手編集禁止。package/promoteコマンドで生成する（T2）。 |
| C-3 | 全6 harness波及と4 self-install面を各該当Boltで検証する（T4）。 |
| C-4 | harness専用toolをcore/toolsへ置かない（T6）。 |
| C-5 | PR mergeは人間承認後にleaderだけが執行する（O2）。 |
| C-6 | Bolt単位PR・squash merge・同時active builder最大4（O4）。 |
| C-7 | 規制要件なし。upstream MIT-0の検査/適応は既存Amadeus license境界内（R1/R2）。 |

## 前提

- upstreamタグとpeeled SHA、承認済みplan/ledger、同日RE observedは有効な比較基準である。
- Construction開始時にmainが前進している場合は、実装前にdiff-refreshし、classificationとfile:lineを更新する。古いline番号を仕様とみなさない。
- 物理Unit分割、module seam、ADR代替案、Bolt規模はapplication-design / units-generation / delivery-planningが本要件を変えずに確定する。

## Out of Scope

- SKIP 6件: optional-produces、agent-model-key、learnings-memory-path、dist-trees、roadmap-html、upstream-changelog/README。
- plugin deferred面: agents/scopes/memory/knowledge投影、`adds.scopes`、`adds.requires_stage`、`when`評価、marketplace、managed settings、lockfile、Kiro `.kiro.hook`自動発火CLI。
- pre-v2.2.0全体の同等性認証、upstreamへの還流、release/version/tag/npm publish、application deployment。
- 未要求の後方互換layer、migration shim、既存巨大fileの一般refactor。

## 設計への委譲（仕様変更ではない）

- schema + Unit kind の共有seamとmodule境界。
- plugin source / projection / compose / drop のtransaction境界とno-clobber実装方式。
- 24項目のUnit/Bolt分割、数値行数見積り、既存infrastructure reuse inventory。
- 4検証先行項目のtest seam。ただしverdict条件はFR-0で固定済み。

## Open Questions

なし。後続で要件変更が必要になった場合は単独で読み替えず、仕様変更としてユーザーへエスカレーションする。

## トレーサビリティ

| 要件 | upstream item / ideation由来 | RE / 実測由来 |
|---|---|---|
| FR-0 | plan Risks、intent-backlog PU-1 | architecture 24項目判定、code-quality-assessment |
| FR-1 | D1 items 1–6 | architecture items 1–6、constraint-register |
| FR-2 | D2 items 7–10 | architecture items 7–10、code-structure |
| FR-3 | D3 items 11–12 | architecture items 11–12 |
| FR-4 | D4 items 13–15 | architecture items 13–15、6 harness inventory |
| FR-5 | D5 items 16–17 | architecture items 16–17、team-practices |
| FR-6 | D6 items 18–22 | architecture plugin diagram、code-structure ownership |
| FR-7 | D7/D8 items 23–24 | tests 461分類、package/promote実測 |
| FR-8 | plan ledger transition contract | intent-statement Success Metrics |
| NFR-1–8 | feasibility T1–T6/O1–O4、team-practices | code-quality-assessment、RE checks |
