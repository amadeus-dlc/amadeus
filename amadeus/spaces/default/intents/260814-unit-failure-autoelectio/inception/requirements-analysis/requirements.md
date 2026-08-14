# Requirements — 260814-unit-failure-autoelectio (Issue #2976)

## Intent 分析

solo mode かつ階層設定 `solo-election.trigger.mode=auto` のワークスペースで、Construction の canonical Unit failure が発生すると、engine (`amadeus-orchestrate.ts`) は正準 protocol (`stage-protocol.md:149-152` の solo auto-election hook) に反して無条件で人間向け `ask` directive を返し、unattended run が停止する。目標は、fail-closed の halt 品質を一切緩めずに、protocol branch 1(auto 時は prompt を提示せず election へ付託)を engine 断面で実現し、`autonomy=full/semi` の無人継続を回復することである。

上流入力: `codekb/amadeus/architecture.md`(本 intent 節 — failure-ruling seam と solo auto-election hook の責務境界断裂)、`codekb/amadeus/code-structure.md`(本 intent 節 — Issue #2976 の変更面)、`codekb/amadeus/business-overview.md`(本 intent 節 — auto 設定が無人実行に反映されない面)を消費した。三面とも本 intent の RE 差分リフレッシュ(observed `cd64486a6`)で更新済みであり、引用は各面の本 intent 節に限る。

## 機能要件

### FR-1: fail-closed halt の維持

canonical Unit failure の halt と品質ゲートを維持する。失敗を成功扱いせず、無条件 skip・自動 retry を導入しない。受け入れ: 修正後も `await-unit-ruling` 遷移で workflow が前進せず、ruling(retry/skip/abort)なしに次バッチへ進まないことをテストで実測。

### FR-2: engine が auto 分岐を持つ

`emitConstructionFailureIfPresent` の `await-unit-ruling` 分岐(HEAD `amadeus-orchestrate.ts:4069-4075`)で階層 config の `solo-election.trigger.mode` を解決し、`auto` のとき ordinary `ask` を emit しない。`manual`・不在のときは現行の `ask` を不変で返し、invalid は NFR-2 どおり判別可能な `errorDirective` で fail-closed に停止する。config 解決は election CLI `handleTriggeredOpen`(`amadeus-election.ts:443-463`)と同一の解決値(project→space→intent の3層)を用い、両者の判定が divergence しないこと。

### FR-3: election 委任 directive の新設

auto 分岐では新種 directive(kind は `ask` 以外)を emit し、conductor へ election 付託を指示する。directive は Retry / Skip / Abort を choices とする election definition の材料(unit・stage・attempt・batch・siblings)を carry し、conductor が definition JSON を書いて `bun amadeus-election.ts open --trigger auto --file <definition.json>` を実行する。裁定根拠: Q1 = A(semi 梯子 AUTO_DECIDED `auto-decision-285d7a74a6a8940f8aa19ee6ddbaded5`)。

### FR-4: CLI envelope を唯一のフォールバック判別子とする

election CLI が `{"opened":null,"reason":"solo-election-manual-trigger-required"}` を返した場合のみ、protocol branch 2 として従来の人間向け prompt(Retry/Skip/Abort)を提示する。engine・conductor とも「team mode の機械判定」を実装しない(engine に solo/team 判定 seam は存在しない — reviewer-2 精緻化(c))。

### FR-5: ruling の commit は既存経路を再利用する

election の ruling は既存の `report --user-input retry|skip|abort` 経路(`amadeus-orchestrate.ts:6161-6169` → `handleFailureRuling:6507`)で commit し、新規の遷移・engine seam を追加しない。auto election が成立した場合、人間の `HUMAN_TURN` を要求しない。

### FR-6: 非収束時は人間へ fail-closed フォールバック

election が単一の retry/skip/abort に収束しない場合(可否同数の割れ・hold・中断・CLI エラー)は、自動裁定せず人間向け prompt へフォールバックする(ユーザーエスカレーション正準リスト(1)に整合)。受け入れ: 非収束系のフォールバックがテストで固定される。

### FR-7: engine directive 述語の両側テスト

TDD で以下を固定する: (a) auto 設定 seed 下で engine の directive `kind !== "ask"`(新種 kind である) (b) config 未 seed / manual seed 下で `kind === "ask"` が不変(既存 `t211-swarm-batch-progress.test.ts:326-333` は manual 側期待として維持) (c) Retry / Skip / Abort 各 ruling の統合テスト。protocol テキストのみの検査(t369 型)を engine 挙動の担保と数えない。

### FR-8: 配送面の同期

`stage-protocol.md` の halt-and-ask 節・conductor 向け手順・各ハーネス `SKILL.md` の該当行(例: codex `SKILL.md:68` の「failure always halts and asks regardless of autonomy mode」)を新 directive の契約と一致させ、`bun run build` で全ハーネス投影・self-install 面を同一変更で再生成する(t369 が 13 配送面を走査)。

### FR-9: audit 追跡性

election open / ruling と、その後の failure transition(retry/skip/abort)が audit 上で追跡可能であること。既存イベント語彙(`audit-format.md`)の範囲で構成し、新イベント名を発明しない。

## 非機能要件

- **NFR-1(回帰ゼロ)**: manual/不在 config の既存挙動・既存テストは不変。現行ブロッキングゲート全緑(typecheck、Biome lint、隔離2回ビルド再現性、source-only 境界、グラフ不変量、`tests/run-tests.sh --ci`、Project/Patch Coverage Gate、plugin-conformance-e2e)。
- **NFR-2(fail-closed)**: config 解決の invalid は fail-closed(errorDirective の既存作法 `:633-643` / `:3941-3944` に整合)とし、無音で ask へ落とさない(判別可能な形で従来動作へ)。

## 制約

- TDD 必須: 合意済み seam へ失敗テスト1件 → Red 実測 → 最小実装 → Green の vertical slice(team.md Testing Posture)。
- Bolt ごとに PR、squash マージ、マージは人間承認(自発マージ禁止)。
- 正本は `packages/framework/core/` のみ編集し、`dist/`・self-install は `bun run build` で再生成。

## 前提

- election CLI の受け口(`open --trigger auto` の config 検証・decline envelope)は実装済みで変更不要(RE 実測 `amadeus-election.ts:443-463`、t236 が固定)。
- voters は solo 選挙規約どおり `subagent-1`/`subagent-2`(`skills/amadeus-election/SKILL.md:28`)。CLI は voter 名を制約しない。

## スコープ外

- §13 学習選定・design-deviation hook の auto-election 面(健全 — reviewer-2 対称面(2))。
- 関連 Issue #2833 / #2912 / #2967(別機序、#2967 は修正済み)。
- `stage-protocol.md:154` の宙参照(reviewer-1 C10、別 Issue 候補)。
- election CLI 本体・指令ループの機能変更。

## 未解決事項

- 新 directive の kind 名・carry フィールドの厳密形状、engine 側 config 解決の呼出形(1引数の active-cursor 解決で CLI と一致するが、worktree 文脈での state 由来 3引数の要否)は functional-design(code-generation 直下の設計工程)で確定する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T07:36:27Z
- **Iteration:** 1
- **Scope decision:** none

FR-1〜FR-9は9件でMinimal深度の5-10件バンド内、consume3面の本intent節と整合し、fail-closed halt・auto分岐・非収束フォールバックの測定可能な受け入れ基準を備えるためBLOCKERなし。

### Findings

- FOLLOW-UP | requirements.md 内の「reviewer-1 C10」「reviewer-2 精緻化(c)」「reviewer-2 未解決3」「reviewer-2 対称面(2)」という引用は、本レビューの consume 3面(business-overview.md / architecture.md / code-structure.md の260814節)いずれにも出現せず、Issue #2976 のクロスレビュー・スレッド由来と推測されるが本スコープ内では確認できない。開発者が Issue にアクセスできない場合に判断根拠を再現できるよう、これらの参照元をどこかの成果物(intent record 等)で追跡可能にしておくことが望ましい。
- FOLLOW-UP | FR-2 は resolveAmadeusConfig の呼出を「project→space→intent の3層」と規定するが、architecture.md の設計選択点は既存コードが1引数呼出(:3940)と3引数呼出(:632)で不揃いであることを指摘しており、FR-2 の3層要求を満たすには3引数呼出が必要になる可能性が高い。この点は『未解決事項』へ意図的に先送りされており Minimal 深度では許容範囲だが、functional-design で1引数実装が選定されないよう FR-2 の文言(3層解決を明示要求)を実装ゲートで機械チェックできる形に落とし込む必要がある。
- NIT | FR-1〜FR-9 は各1行の密な段落で書かれており、Minimal深度の指示(『behavior + one acceptance check、narrative rationale は省く』)により忠実に沿うなら、behavior文と受け入れ基準文を明示的に分けた短い2行構成の方が可読性が高い。
