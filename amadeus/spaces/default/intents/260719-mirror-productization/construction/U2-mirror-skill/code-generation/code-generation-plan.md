# Code Generation Plan — U2-mirror-skill

## 計画の前提

- 対象 Unit は `U2-mirror-skill`、対応要件は `FR-3`。ユーザーストーリー工程はスコープ上 SKIP のため、各 Step をリカバリー・ジャーニー、`U2`、`FR-3`、`BR-U2-1`〜`BR-U2-6`、U2 の機能／NFR 設計へ直接 trace する。
- 正本は新規 `packages/framework/core/skills/amadeus-mirror/SKILL.md` とする。frontmatter は `name: amadeus-mirror`、非空 description、`user-invocable: true` を持ち、`classification: read-only` は付けない。create / sync / close を人間の選択後に実行できる session skill であり、既存 read-only session skills 4種との意図的相違を本文へ明記する。
- SKILL は U1 の CLI 契約を消費する薄い手順書であり、診断・GitHubアクセス・state読取／書込ロジックを再実装しない。実行可能なコマンドは `bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts <verb>` だけとし、`gh`、`eval`、shell展開、自由文からのコマンド抽出を禁止する。
- Step 1 の唯一の入口は `status`。exit 1 だけでは正常な乖離と認定せず、ツールプロセスが起動済みで、stderr に起動／実行失敗がなく、stdout の全非空行が U1 の既知 finding kind と契約済み detail 形に適合する場合だけ `diverged` と分類する。起動不能、未知 exit、未知 kind、欠落／余剰行、構造不正は loud に停止し、Step 2 へ進めない。
- 解釈対象は検証済み `StatusOutcome` の finding kind (`mirror-missing` / `stale-status-line` / `issue-drifted`)だけとする。自由文 detail と stderr は表示専用で、解析、分類、verb選択、コマンド生成には使わない。`stale-status-line`ではdetailを見ずsync/close両候補を提示する。
- executable bash fenceは引数なしの固定4コマンドだけとする。任意intent指定は別手順で、active space内に実在するintent directoryの正確なbasenameを検証し、shell文字列を構築・補間せず`--intent`に続く単一引数として渡す。
- create / sync / close は SKILL 固定の verb と固定コマンド例からのみ提示し、診断後に人間が最終 verb を明示選択した場合だけ実行する。status 結果だけでの自動実行、既定選択、自由文からの verb 推測を行わない。
- Test Strategy は **Comprehensive**。静的な文書契約を unit、正本・docs・packager境界を integration、6 harness の生成済み利用面を E2E 相当で検証する。各主要面10〜15ケースを目安にし、既存 skill conformance 回帰も実行する。
- DB、HTTP API、UI、IaC、環境変数、追加依存は本 Unit に存在しないため対象外。既存 test runner / TypeScript / Biome 構成で不足なく収集される場合、設定ファイルは変更しない。

## 変更ファイル候補

| 区分 | ファイル | 予定変更 |
|---|---|---|
| SKILL 正本 | `packages/framework/core/skills/amadeus-mirror/SKILL.md` | frontmatter、status-first の3 Step、構造検証、finding別案内、人間の最終verb選択、運用注記 |
| 直接 coreDirs 投影 | `packages/framework/harness/claude/manifest.ts`、`packages/framework/harness/kiro/manifest.ts`、`packages/framework/harness/kiro-ide/manifest.ts`、`packages/framework/harness/cursor/manifest.ts` | `skills/amadeus-mirror` の投影行を追加。Cursor は runner生成を使わず、この session skill だけを明示投影 |
| emit 経由投影 | `packages/framework/harness/codex/emit.ts`、`packages/framework/harness/opencode/emit.ts` | 既存 session skill 列挙へ `amadeus-mirror` を追加。Codex は既存様式どおり `agents/openai.yaml` guard も生成 |
| Skills 集合契約 | `tests/unit/t123-skills-spec-conformance.test.ts`、`tests/smoke/t123-skills-spec-conformance.test.ts`、`tests/unit/t150-codex-packaging.test.ts` | base skill 集合・件数・説明コメントを新しい5 session skill構成へ追随 |
| U2 Unit test | `tests/unit/t258-amadeus-mirror-skill.test.ts` | frontmatter、Step順、唯一のコマンド面、exit／構造検証、人間選択、禁止語・禁止実行面 |
| U2 Integration test | `tests/integration/t258-amadeus-mirror-skill.integration.test.ts` | 正本・manifest/emit配線、英日 docs 語彙同期、既存 U1 CLI 契約との整合 |
| U2 E2E相当 | `tests/e2e/t258-amadeus-mirror-skill-distribution.test.ts` | 6 harness の生成先、token置換、正本由来内容、Codex guard、実行pathを検証 |
| 英語 guide | `docs/guide/17-skills.md` | Mirror workflow 節を新設し、使い方・exit 0/1/2・4 verb・human gate・運用注記を記載 |
| 日本語 guide | `docs/guide/17-skills.ja.md` | 英語正本と同じ見出し・契約語彙を持つ対訳 Mirror workflow 節を追加 |
| 配布生成物 | `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**/skills/amadeus-mirror/` および自己導入面 | core正本から生成。手編集禁止 |

> テスト番号 `t258` は実装開始時に最新の `tests/` を再走査し、共有作業で使用済みなら unit / integration / E2E を同じ次番号へまとめて変更する。

> 機能設計は「coreDirs を6ハーネス分」と概括しているが、現行 Codex / OpenCode は session skills を各 `emit.ts` の列挙から生成し、Codex は同時に implicit-invocation guard を付与する。既存配布機構を壊さないため、Claude / Kiro / Kiro IDE / Cursor は manifest `coreDirs`、Codex / OpenCode は manifest に接続された既存 emit 列挙を最小変更する。6面投影という設計結果は維持する。

## 実装計画

- [x] **Step 1: baseline、正本境界、配布経路を固定する**  
  U1 の `StatusOutcome` / `StatusFinding` / `handleStatus`、既存 session skill 4種、6 harness の manifest / emit、skill conformance test、英日 guide の対訳構造を再確認する。既存の U1 tool を変更せず、U2 が prose-only adapter であることを差分境界として固定する。  
  **検証:** U1 t232 unit / integration、t107 / t111、t123 unit / smoke、t150 が変更前 green。`package.json` / lockfile 差分なし。  
  **Trace:** リカバリー・ジャーニー、U2、FR-3、BR-U2-1、BR-U2-2、BR-U2-6、PD-U2-1/2。

- [x] **Step 2: SKILL frontmatter と status-first 骨格の落ちるテストを作る**  
  `t258` unit に、正本実在、`name: amadeus-mirror`、非空 description、`user-invocable: true`、`classification: read-only` 不在、500行以下、Step 1=`status`、Step 2=案内、Step 3=人間が選んだ verb の実行、という契約を先に固定する。SKILL 本文に read-only 4種との相違説明があることも検証する。  
  **検証:** 正本追加前に対象 test が missing-file で赤になり、frontmatter／Step順の各 assertion が独立して失敗可能。  
  **Trace:** U2、FR-3(a)(c)、BR-U2-2、BR-U2-3、Domain Entities、story-map U2(1)。

- [x] **Step 3: status を唯一の診断入口とする SKILL 骨格を実装する**  
  Step 1 に引数なしの `bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts status` を1回だけ置く。任意intent指定は別手順とし、実在directoryの正確なbasenameを検証後、shell command stringを組み立てず単一argvで渡す。探索、retry、独自の record/state 読取、`gh` 直呼び、別 script、追加 shell pipelineを置かない。  
  **検証:** executable code fence の固定4行にplaceholder、`--intent`、shell変数がない。intent値がcommand分割・展開されない契約がgreen。  
  **Trace:** U2、FR-3(b)(c)、BR-U2-1/2、PD-U2-1、SD-U2-1。

- [x] **Step 4: exit と検証済み StatusOutcome の分類契約をテストで固定する**  
  exit 0 は clean 報告後停止、exit 2 は precondition 理由・復旧手順を表示後停止、exit 1 は「正常起動＋stderr に起動／実行失敗なし＋stdout 全行が検証済み finding 形」の全条件を満たした場合だけ Step 2 へ進む、と assertion 化する。exit 1 でも出力なし、未知 kind、構造不正、ツール不在／spawn失敗、未知 exit は loud stop とする。  
  **検証:** exit 1 のみを条件にした欠陥、起動失敗を diverged と誤分類する欠陥、未知行を無視する欠陥に対し test が赤になる。  
  **Trace:** U2、FR-3、BR-U2-2、Business Logic Model Step 1、PD-U2-1、SD-U2-2。

- [x] **Step 5: 検証済み分類だけを使う finding 案内を実装・検証する**  
  `mirror-missing`→create、`issue-drifted`→sync、`stale-status-line`→sync/close両候補、という表を本文へ固定する。staleではsyncがopen mirrorを更新すること、closeがfail-closed landing checkで未着地時に拒否され得ることを説明する。自由文 detail、reason、stderr を解析せず、そのまま表示するだけと明記する。  
  **検証:** 3 finding の固定写像、stale両候補、複数findingの全件提示、自由文に状態名・`close`・shell文字列が含まれても分類・実行しない契約が green。  
  **Trace:** U2、FR-3、BR-U2-2/5、Business Logic Model Step 2、SD-U2-2。

- [x] **Step 6: 人間の最終 verb 選択と実行結果報告を実装・検証する**  
  create / sync / close は診断提示後に候補として示すだけとし、人間が最終 verb を明示選択するまで実行しない。選択後も SKILL に固定された `bun {{HARNESS_DIR}}/tools/amadeus-mirror.ts <selected-fixed-verb>` だけを実行し、exit code、stdout、stderrを報告する。既定選択、auto-resolution、statusからの自動実行、自由文の補間を禁止する。  
  **検証:** status以外の各 mutating verb が human-selection 節より前に実行指示として現れないこと、許可verb集合外を実行しないこと、実行失敗を再試行／別verbへ自動切替しないことを静的検査。  
  **Trace:** U2、FR-3、BR-U2-3、Business Logic Model Step 3、SD-U2-2。

- [x] **Step 7: conductor 運用注記を正確に追加する**  
  create / close は conductor から実行する運用合意であること、**機械強制ではない**ことを明記し、「拒否される」「実行不能」等の強制を装う文言を禁止する。ノルム本文を複製せず `amadeus/spaces/<space>/memory/team.md` の運用合意を参照する。close 提案には U1 tool が close-after-landing を fail-closed 検証する旨を添える。  
  **検証:** 3条件（機械強制なし、強制装い禁止、team.md参照）と close-after-landing 注記を unit test で固定。  
  **Trace:** U2、FR-3、BR-U2-4/5、ADR-5。

- [x] **Step 8: 6 harness の投影配線と既存 skill 集合契約を更新する**  
  Claude / Kiro / Kiro IDE / Cursor の manifest `coreDirs` に正本を追加し、Codex / OpenCode の既存 session-skill emit 列挙へ追加する。t123 の base skill 集合と t150 の Codex skill 件数・guard期待を更新する。ハーネス別 SKILL 複製や手書き dist を作らない。  
  **検証:** manifest / emit の6面すべてに1つだけ投影経路があり、t123 unit / smoke、t150 が green。Codex のみ既存規約どおり `agents/openai.yaml` を伴う。  
  **Trace:** U2、FR-3(a)、BR-U2-1、PD-U2-2、N-3。

- [x] **Step 9: 英日 guide に同期した Mirror workflow 節を追加する**  
  `docs/guide/17-skills.md` と `.ja.md` に対応見出しを新設し、呼出名、status-first、status/create/sync/close、exit 0/1/2、finding別案内、人間の最終verb選択、自由文非実行、conductor運用注記の3条件を同じ意味で記載する。既存相互 language link と見出し配置を保つ。  
  **検証:** 両文書に mirror 節が各1つ存在し、4 verb、3 exit、3 finding、human gate、機械強制なし、team.md参照の正規化語彙集合が一致。既存 language-link gateもgreen。  
  **Trace:** U2、FR-3、BR-U2-3〜BR-U2-6、PD-U2-2、SD-U2-2。

- [x] **Step 10: Comprehensive の integration / E2E相当テストを完成させる**  
  integration では正本と U1 公開契約の語彙整合、manifest / emit の投影全数、英日 docs 同期、禁止面を検証する。E2E相当では `bun run dist` 後の6生成先を列挙し、各 SKILL が正しい harness pathへ token置換され、`{{HARNESS_DIR}}` や他 harness 名を残さず、status-first・human gate・自由文非実行契約を保つことを確認する。  
  **検証:** unit / integration / E2E の対象3ファイルがすべて実在し、runner の実行ファイル数表示が3件と一致。各主要面10〜15ケースを目安に green。  
  **Trace:** U2、FR-3(a)〜(c)、BR-U2-1〜BR-U2-6、PD-U2-1/2、SD-U2-1/2、N-2/3。

- [x] **Step 11: test設定、lcov、配布生成物を検証する**  
  既存 Bun runner、coverage、TypeScript、Biome が t258 と既存回帰を収集することを確認し、不足時だけ最小の設定変更を行う。文書主体のため lcov の主対象は新規 test helper / parser の実行行とし、SKILL / docs の内容カバレッジは契約表の全ケース対応で測る。core正本から6 harness と自己導入面を生成する。  
  **検証:** 対象 coverage の新規実行行0-hitなし、`bun run dist`、`bun run promote:self`、`bun run dist:check`、`bun run promote:self:check` green。6生成先を全数確認。  
  **Trace:** U2、FR-3、BR-U2-1〜BR-U2-6、N-2/3。

- [x] **Step 12: 全品質ゲートと差分監査を実行する**  
  U1 t232、U2 t258、既存 session-skill / skill-spec / packaging 回帰、typecheck、対象Biome、全lint、全CI、dist/self-install checkを実行する。正本以外のSKILL手編集なし、`gh`直呼び0、state書込0、`eval` / shell展開0、自由文実行0、追加依存0、classification read-only不在、英日docs同期をgrepとdiffで再確認する。  
  **検証:** `bun run typecheck`、`bun run lint:check`、`bun tests/run-tests.ts --ci --coverage --coverage-dir <temp>`、`bun run dist:check`、`bun run promote:self:check` がgreen。`package.json` / lockfileが不変。  
  **Trace:** リカバリー・ジャーニー、U2、FR-3、BR-U2-1〜BR-U2-6、PD-U2-1/2、SD-U2-1/2、N-2〜N-4。

## StatusOutcome 決定表

| 観測 | SKILL の分類 | 動作 |
|---|---|---|
| status 正常起動、exit 0 | clean | 「乖離なし」を報告して終了 |
| status 正常起動、exit 2 | precondition | 理由と復旧手順を提示して終了 |
| status 正常起動、exit 1、stderrに起動／実行失敗なし、stdout全行が既知finding構造 | diverged | 全 finding を提示し、候補verbを案内して人間の選択を待つ |
| process起動不能／tool不在 | 起動失敗 | loud stop。exit 1 の diverged と扱わない |
| exit 1 だが stdout 空、未知kind、構造不正、または実行失敗stderr | 検証不能 | 原文を表示して loud stop。Step 2へ進まない |
| 未知 exit | 未知失敗 | loud stop。推測・retry・別verb実行をしない |

## Comprehensive テスト配分

| 層 | 主対象 | 必須ケース |
|---|---|---|
| Unit | SKILL frontmatter / prose contract | name、description、user-invocable、read-only不在、500行上限、Step順、status唯一入口、exit 0/1/2、起動失敗とexit 1の区別、3 finding、stale両候補、自由文非解析、人間最終verb選択、引数なしfence、intent basename単一argv、運用注記 |
| Integration | U1契約 / projection wiring / docs | U1 kind集合との一致、6 manifest/emit経路、skill集合回帰、英日mirror節、4 verb・3 exit・3 finding・human gate語彙同期、禁止面grep |
| E2E相当 | 生成済み6 harness | Claude `.claude/skills`、Codex `.agents/skills`、Cursor `.cursor/skills`、Kiro / Kiro IDE `.kiro/skills`、OpenCode `.opencode/skills`、token置換、Codex guard、dist/self-install parity |

## 完了条件

- `packages/framework/core/skills/amadeus-mirror/SKILL.md` が唯一の正本で、6 harness へ投影される。
- Step 1 は必ず status で、exit 1 単独ではなく検証済み StatusOutcome の構造を満たす場合だけ finding 案内へ進む。
- `mirror-missing`→create、`issue-drifted`→sync、stale→sync/close両候補が固定され、人間が最終選択する。
- 自由文 detail / stderr は表示専用で、解析・実行・分類・コマンド生成へ使われない。
- executable bash fenceは引数なしの固定4コマンドだけで、任意intentは実在directoryの正確なbasenameを単一argvとして渡す。
- create / sync / close は人間の最終選択後だけ、固定 `{{HARNESS_DIR}}` コマンドとして実行される。
- conductor 運用注記が機械強制なし・強制装い禁止・team.md参照の3条件を満たす。
- 英日 guide の Mirror workflow 節が意味・契約語彙とも同期する。
- Comprehensive の unit / integration / E2E相当、lcov、typecheck、lint、全CI、dist/check、promote/self/checkがgreen。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:29:57Z
- **Iteration:** 1
- **Scope decision:** approved — U2-CG-SPOT-001 — packages/framework/core/skills/amadeus-mirror/SKILL.md — reason: Verify the status-output grammar, free-text handling, fixed verbs, final human choice, lack of direct gh/state access, and maintainable skill structure. — owner: amadeus/spaces/default/intents/260719-mirror-productization/construction/U2-mirror-skill/functional-design/business-logic-model.md#Integration spot-check owner: U2-CG-SPOT-001 — `packages/framework/core/skills/amadeus-mirror/SKILL.md`

Skillは安全な3 Step構造だが、stale判定が自由文detailへ依存し、bash fenceに省略記法と未検証intent引数を含む。

### Findings

- MAJOR CG-U2-I1-001: stale-status-lineはdetailを解析せずsync/close両候補を人間へ提示する。
- MAJOR CG-U2-I1-002: 実行bashから省略記法を除き、検証済みintent basenameを構造化引数として渡す。
- RESOLVED CG-U2-I1-003: 権限境界・human gate・保守性を確認。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:38:48Z
- **Iteration:** 2
- **Scope decision:** approved — U2-CG-SPOT-002 — packages/framework/core/skills/amadeus-mirror/SKILL.md — reason: Verify stale kind-only handling with sync and close choices, free-text non-parsing, fixed executable command fences, validated intent basename as one argument, and the human gate. — owner: amadeus/spaces/default/intents/260719-mirror-productization/construction/U2-mirror-skill/functional-design/business-logic-model.md#Integration spot-check owner: U2-CG-SPOT-002 — `packages/framework/core/skills/amadeus-mirror/SKILL.md`

stale kind-only分類、自由文非解析、安全な単一argv、固定command fence、human gateを設計とSkill正本で確認した。

### Findings

- RESOLVED CG-U2-I1-001: stale自由文detail依存を除去。
- RESOLVED CG-U2-I1-002: 実行fenceとintent単一argv境界を是正。
- RESOLVED CG-U2-I2-001: BR-U2-2/5をsync/close両候補へ統一。
- RESOLVED CG-U2-I2-002: 修正済みSkill正本を限定確認。
