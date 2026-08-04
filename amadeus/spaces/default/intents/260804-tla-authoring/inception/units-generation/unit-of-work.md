# Units Generation: Unit of Work 定義

承認済み Application Design（`inception/application-design/` の components.md、component-methods.md、services.md、component-dependency.md、decisions.md）の C1〜C9 を、`units-generation-questions.md` の回答（Q1: 価値鎖スライス + 基盤分離の 6 unit、Q3: 未知題材 = swarm unit-pool ライフサイクル）に従って 6 つの Unit of Work へ分解する。要求の正本は `inception/requirements-analysis/requirements.md`（FR-001〜FR-013、AC-001〜AC-008）。user-stories stage は本 scope で SKIP のため `stories.md` は存在しない（設計どおりの欠落 — 対応付けは `unit-of-work-story-map.md` が FR/AC 単位で行う）。

## Unit 一覧

| Unit | kind | 含む component | 複雑度 | 規模見積（行） |
|---|---|---|---|---|
| U1 `tla-evidence-foundation` | library | C2 IdentityDigest、C4 EvidenceBundle | M | ~600 |
| U2 `applicability-hold` | library | C1 ApplicabilityJudge、C9 AuthoringHoldEvaluator + advisory 結線 | M | ~500 |
| U3 `authoring-referees` | library | C3 TraceCoverage、C5 ProofObligations | L | ~700 |
| U4 `registration-committer` | library | C6 RegistrationCommitter | S | ~300 |
| U5 `authoring-stage-e2e` | spec | C7 AuthoringStage 文書 + 未知題材 E2E fixture | M | ~400 |
| U6 `import-closure-guard` | packaging | C8 ImportClosureGuard + manifest 修復 | S/M | ~250 |

規模は数値見積りで記録する（`memory/phases/inception.md` の規模正当化ガードレール）。合計 ~2,750 行（テスト除く実装 + 文書）。

## 各 Unit の定義

### U1: tla-evidence-foundation（library）

- **責務**: stable ID 単位の identity 正規化・digest 計算・staleness 比較（C2）と、evidence store（`specs/tla-evidence/`）の単一書き手（C4。full authoring bundle / terminal route receipt の 2 kind、content-addressed、predecessor 連鎖、root marker）。`tla-authoring.ts identity` / `bundle` サブコマンド。
- **境界**: identity と evidence の語彙・schema をこの unit が一元所有する。他 unit は型と CLI 契約経由でのみ利用する（component-dependency.md の「書き手の単一化」）。
- **配備モデル**: リポジトリ内 CLI ツール（`plugins/formal-model-check/tools/`）。常駐なし。
- **主対応**: FR-004/FR-005（保存先として）、FR-006/FR-007（identity）、NFR-002。
- **実装注意**: digest は canonical 直列化の全 bytes 対象（decisions.md ADR-3）。functional domain modeling スタイル（ブランド型 + Result）。

### U2: applicability-hold（library）

- **責務**: 適用判定の 4 分岐と receipt 生成（C1）、hold 評価器（C9）、および既存 engine advisory checkpoint への結線（plugin.json への advisory code 宣言 + `tla-authoring.ts applicability` / `hold` サブコマンド）。
- **境界**: 判定と hold の評価のみ。永続化は U1（C4）へ委譲。checkpoint 機構そのもの（engine 側）には触れない（decisions.md ADR-6）。
- **配備モデル**: リポジトリ内 CLI + plugin manifest 宣言。
- **主対応**: FR-001、FR-003、FR-004、FR-005、FR-007、AC-001〜AC-004、AC-006。
- **実装注意**: §11a checkpoint の fail-closed 機械強制の実読確認（application-design レビュー FOLLOW-UP-1）をこの unit の functional-design 冒頭で行い、否定される場合は ADR-6 の再裁定を人間へ返す。

### U3: authoring-referees（library）

- **責務**: trace coverage の全数評価（C3）と proof 完了条件の評価（C5。TLC 完全探索・falling・vacuity・reduction evidence — 既存 TLC toolchain を子プロセス契約で再利用）。`tla-authoring.ts trace` / `proof` サブコマンド。
- **境界**: 評価のみを行う referee。モデル作成（C7 の作業）と登録（C6）は含まない。
- **配備モデル**: リポジトリ内 CLI。TLC 実行は既存 toolchain の child process。
- **主対応**: FR-006、FR-008、AC-005。
- **実装注意**: 部分成功を成功へ丸めない（invariant ごとの falling proof、欠陥の全数列挙）。複雑度 L の根拠は proof 5 条件 × 既存 toolchain 統合の面数。

### U4: registration-committer（library）

- **責務**: 登録前提の全数検査と `model-map.json` の atomic replace（C6。rename 直前再読込による競合検知、bundle 参照フィールドの追加）。`tla-authoring.ts commit` サブコマンド。
- **境界**: 可視化点の所有者。evidence の生成・検証は U1/U3 の出力を消費する。
- **配備モデル**: リポジトリ内 CLI。
- **主対応**: FR-010、AC-001（登録拒否面）、FR-013（既存 schema 互換）。
- **実装注意**: 既存 model-map v2 の exactObject 制約と completeness sensor への影響を functional-design で実読確定（decisions.md ADR-3 の明示タスク）。

### U5: authoring-stage-e2e（spec）

- **責務**: authoring stage 文書（C7。`plugins/formal-model-check/stages/` の stage protocol 準拠文書、独立 reviewer と人間ゲートの提示位置）と、未知題材 E2E（FR-012）。E2E 題材は **swarm unit-pool ライフサイクル**（acquire → confirm-dispatch → settle-release → reconciliation。`amadeus-swarm.ts` の fixed pool protocol）を fixture とする（Q3 人間裁定）。
- **境界**: stage 文書と E2E fixture が成果物。判定 verdict の合否実測は build-and-test stage が受け入れ主体（decisions.md 末尾注記）。
- **配備モデル**: plugin stage 文書（配布物）+ テスト fixture。
- **主対応**: FR-002、FR-009、FR-012、AC-007。
- **実装注意**: E2E は composed runtime で実行し missing import ゼロを併せて実測する（AC-007。U6 の guard が一次担保、E2E が補完検証）。

### U6: import-closure-guard（packaging）

- **責務**: projection 時の再帰 import-closure 検査（C8）と、既存欠落 2 module（`tla-model-receipt.ts`、`tla-module-deps.ts`）の plugin.json manifest 修復。
- **境界**: build/projection 基盤のみ。実行時 value chain に参加しない（component-dependency.md）。
- **配備モデル**: `scripts/plugin-projection.ts` への組込 + pure module。
- **主対応**: FR-011、NFR-005、AC-007（missing import ゼロの一次担保）、AC-008。
- **実装注意**: guard は pure 関数 + 注入 seam で unit test 可能に（NFR-006）。

## 上流トレーサビリティ

- `inception/application-design/components.md`（C1〜C9 の責務境界）/ `component-methods.md`（API 契約）/ `services.md`（S1〜S7 の協調単位）/ `component-dependency.md`（依存と書き手単一化）/ `decisions.md`（ADR-1〜ADR-7）
- `inception/requirements-analysis/requirements.md`（FR/AC/NFR）
- `inception/units-generation/units-generation-questions.md`（Q1〜Q3 の人間回答）
- team-practices: `memory/team.md`、`memory/project.md`、`memory/phases/inception.md`

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T17:16:13Z
- **Iteration:** 1
- **Scope decision:** none

3成果物を検証。C1〜C9はU1〜U6へ重複なく全数割当、FR-001〜013・AC-001〜008も過不足なくマッピング。yaml依存ブロックは整形・一意宣言・全解決・自己依存なし・非循環で、kindは閉集合内。application-designの依存マトリクスと型契約から導出したユニット間依存とも一貫し、実装順序・critical pathの推奨は境界規則どおり含まれない。数値規模見積りも全ユニットに記載され、user-stories欠落はFR/AC単位対応のdocumented fallbackで適切に処理。ブロッカー相当の欠落なし。

### Findings

- FOLLOW-UP | unit-of-work.md §U5 authoring-stage-e2e — kind=specが「stage文書(契約)」と「未知題材E2E fixture(実行可能テストコード)」という性質の異なる2種の成果物を1 kindに束ねている。kindがConstruction成果物の適用範囲を決めるため、Functional Design/Code Generation着手時にこの複合ユニットのどちらの半分にどの成果物セットが適用されるかを明示確認すること。
- FOLLOW-UP | unit-of-work-dependency.md §依存の根拠(registration-committer→authoring-referees) — この辺はcomponent-methods.md §C6(RegistrationPreconditionsがCoverageProof/ProofEvidence型を消費)から正しく導出されているが、component-dependency.mdの依存マトリクスC6行にはC3/C5への辺が未記載(→C2、→C4のみ)。Functional Designがマトリクスのみを参照するとこの型依存を見落とすリスクがあるため申し送りとして記録する。
