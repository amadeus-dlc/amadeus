# Units of Work

Intent: 260818-priority-bug-batch-4(depth Minimal、2 unit、プラン承認済み — questions ファイルの Step 5 記録)

上流: `../application-design/components.md`(unit 別コンポーネント表)・`decisions.md`(ADR-1/ADR-2 実装契約)・`component-methods.md`(メソッド契約)・`component-dependency.md`(直列化制約)・`services.md`(サービス非適用判定)、`../requirements-analysis/requirements.md`(FR 帯)。

## Unit 1: issue-2837-invoke-swarm-context

- **kind**: `library`(standalone runtime を持たない engine/contract コード — directive 型・validator・emit 配線・conductor 面契約文書)
- **責務**: FR-2837-1〜5 の全実装。invoke-swarm directive への batch/pool identity 搬送(ADR-1 = 選挙 C)、check_cmd/test_file の正規取得元明記(全 8 conductor 面)、DAG index join 面の全数整合、stale SKILL.md 参照 2 箇所の修正、回帰テスト(batch 導出直接検証 + failed-terminal 再提示、Red 先行)
- **デプロイモデル**: embedded(framework core + 各 harness dist への投影。`bun run build` で全ハーネス再生成)
- **複雑度**: **M**。行数見積り **450-600 行**(内訳目安: engine 実装 ~120、conductor 面 8 × ~10 = ~80、テスト ~250-350、コメント修正 ~10。FD 必須要素込みの較正 — cid:code-generation:c4-loc-calibration に従い監査・エラー処理・テストを含めて計上)
- **制約**: ADR-1 実装契約 1〜8 の全項(閉語彙・prepare 受理形同一変更・join 全数再列挙・retry arm 排他・偽コメント訂正・配送先ツリー受け入れ・Red 先行・台帳 resync)。TDD 既定
- **再利用棚卸し**: 既存 CI ジョブ・tests/run-tests.sh・t135/t113/t181 の既存 fixture・validator 基盤(FIELD_CHECKS)をすべて再利用。新規機構・新規ジョブ・新規ツールなし

## Unit 2: issue-3106-per-unit-outcome

- **kind**: `library`(engine 内 settle 台帳の emitter/reader コード + docs)
- **責務**: FR-3106-1〜4 の全実装。settlePerUnitOutcomes の cancelled/failed arm 追加(ADR-2 = 選挙 A)、SETTLED_UNIT_OUTCOME 3値閉集合化、reader 受理拡張、supersession 規則、pool 優先 de-dup / 数値 batch join の逐語保存、troubleshooting docs 英日更新、落ちる実証(cancelled 必須・failed は到達可能性実証を前提)
- **デプロイモデル**: embedded(同上)
- **複雑度**: **M**。行数見積り **380-500 行**(内訳目安: engine 実装 ~100、テスト ~250-350(Red ×2 + supersession round-trip + de-dup 固定)、docs ~30。較正同上)
- **制約**: ADR-2 実装契約 1〜9 の全項(閉語彙 3 値・coverage ゲート非適用・canonical projection 由来限定・supersession 決定的順序・E-260815-3099 再裁定明記・残余明示・docs 英日・台帳 resync)。TDD 既定
- **再利用棚卸し**: t533 の既存 fixture(seedPerUnitProject / settleThroughPool)・canonical projection・既存 audit 基盤を再利用。新規機構なし

## 独立実装可能性の検証(ノルム (a) 項)

両 unit は独立に価値を出荷できる: U1 は #2837 を単独で閉じ(swarm dispatch の実行可能化)、U2 は #3106 を単独で閉じる(per-unit cancel の構造停止解消)。片側の着地がもう片側の動作を要求しない(U1 の directive 拡張は U2 の settle 台帳と独立、逆も同様)。統合境界の重なりは `amadeus-orchestrate.ts` のファイル共有のみで、機能面の結合はない — 単一 Unit への統合は不要。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-18T08:43:18Z
- **Iteration:** 1
- **Scope decision:** none

契約適合・依存YAML・上流整合は良好だがstory-mapのFR-2837-3行がrequirements.mdの明示数値(7 conductor面)と矛盾する8面と誤記しておりFRカバレッジの全数照合が破綻している

### Findings

- BLOCKER | unit-of-work-story-map.md の FR-2837-3 行が「engine + 8 conductor 面同期」と記載しているが、requirements.md の FR-2837-3 本文は 7 conductor 面(claude/codex/kimi/kiro/kiro-ide/cursor/opencode)の同一変更同期を明示しており数値が矛盾する — FR-2837-2(全8面)と FR-2837-3(7面)は別スコープの数値で、story-map は 2 側の 8 面を 3 の行へ誤転記しFRカバレッジ表の正確性を損なう
- FOLLOW-UP | requirements.md の FR-2837-3 見出し「全 conductor 面の同期」と本文「7 conductor 面」の表現不一致が誤記の一因になりうる — 次回改訂時に見出しを本文の具体数値へ揃える検討価値

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-18T08:45:46Z
- **Iteration:** 2
- **Scope decision:** none

story-mapのFR-2837-3行は7面へ是正されrequirements.md本文と一致し FR-2837-2の8面対比追記もunit-of-work.mdの既存記述と整合、新たな矛盾なし

### Findings

- FOLLOW-UP | requirements.md:26 の FR-2837-3 見出し「全 conductor 面の同期」と本文「7 conductor 面」の表現不一致が iteration 1 から未解消のまま残存 — story-map側は本文の7面表記に正しく追従しているため実害はないが、次回改訂で見出しを本文数値へ揃える価値は残る
