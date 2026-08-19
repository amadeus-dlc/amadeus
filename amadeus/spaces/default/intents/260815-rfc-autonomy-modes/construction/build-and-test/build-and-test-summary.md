# ビルド・テストサマリ — intent 260815-rfc-autonomy-modes(RFC-0001 Intent Autonomy Modes)

## 上流入力

- `code-generation-plan`(13 unit 分): `<record>/construction/<unit>/code-generation/code-generation-plan.md`
- `code-summary`(13 unit 分): `<record>/construction/<unit>/code-generation/code-summary.md`


測定断面: `origin/main` `e7c0515fe` + 本 intent の record 変更のみ(実装差分は全て本断面の祖先として着地済み)。
Test Strategy: **Comprehensive** / Depth: **Standard** / Scope: **self-feature**。

## 全体ビルド状況と前提

| 項目 | 状態 | 実測 |
|---|---|---|
| 依存解決 | ready | `bun install` exit 0(`Checked 116 installs across 139 packages (no changes)`) |
| ビルド | ready | `bun run build` exit 0、8 ハーネス(claude / codex / cursor / kimi / kiro / kiro-ide / opencode / pi)全てで `regenerated`、追跡ファイル不変 |
| 型検査 | green | `bun run typecheck` exit 0 |
| リンター | green | `bun run lint` exit 0(479 warnings / 21 infos = 既存ベースライン) |
| 追加 runtime dependency | なし | 利用者側 Bun-only 前提を維持 |

## テスト種別インベントリ

| 種別 | 生成 | 実体 | 備考 |
|---|---|---|---|
| build-instructions | 済 | `build-instructions.md` | 既存 `bun run build` パイプラインを正本として記述 |
| unit-test-instructions | 済 | `unit-test-instructions.md` | 新規 12 件 + 既存変更多数。PBT は unit 層常駐 |
| integration-test-instructions | 済 | `integration-test-instructions.md` | 新規 11 件。filesystem / process を使う medium test を収容 |
| performance-test-instructions | **N/A 判定** | `performance-test-instructions.md` | 数値目標を持つ性能 NFR が要件に不在。根拠と将来の再判定条件を明記 |
| security-test-instructions | 済(契約テストへ帰着) | `security-test-instructions.md` | セキュリティ NFR は 3 件あるがいずれも契約。既存 contract test で検証し新規スイートを作らない |
| build-and-test-summary | 本ファイル | — | — |
| build-test-results | 済 | `build-test-results.md` | 実行結果の実測転記 |

## 本 intent のテスト面(実測)

13 の実装 merge commit へ `git show --name-only` を適用して列挙した `tests/**/*.ts` は **75 ファイル**、うち **24 ファイルが新規**(`git cat-file -e acbf30bc2^:<path>` が非ゼロを返すもの)。内訳は unit 層 12 件、integration 層 11 件、helper 1 件(`tests/helpers/recommendation-decision-points.ts`)。

## unit ごとのカバレッジ観点

| unit | 主な受け入れ面 | 主担当テスト |
|---|---|---|
| recommendation-core | FR-1 判別ユニオン / FR-4 裁定順序 / Q19 contested 発火率 | `t3116-recommendation-outcome{,.pbt}`、`t3116-recommendation-ladder`、`t3116-contested-frequency`、`t3116-escalation-emits-no-decision` |
| presence-detection | FR-2 セッション単位の対話性読み取りポート | `t3131-nonInteractiveMarker`、`t560-session-interactivity` |
| waiting-interruption | FR-3 waiting を park と別の一級 terminal に(ADR-4) | `t1241-waiting-{terminals,cause,directive,audit-vocabulary,ledger.pbt}`、`t1241-{park-guard-removal,waiting-engine}` |
| interactive-carveout | ADR-5/FR-4 decide-question・compose の carve-out | `t561-interactive-carveout` |
| presence-closure | D7/D8 presence 検査の一様 fail-closed(FR-12) | `t-approve-batch-presence-guard`、`t188-human-presence-gate` |
| merge-provenance | FR-9/Q6 委任マージ provenance | `t-merge-provenance-record` |
| s13-zero | FR-11/ADR-6 §13 候補 0 件の digest 束縛確認 | `t-learnings-s13-zero-seam` |
| grant-ceremony | Q15 preview-autonomy 後の貼り付け可能コマンド | `t3120-grant-ceremony-preview-command` |
| completion-report | C9/ADR-3 完了時 auto-decision summary | `t3121-completion-report{,-markdown}` |
| config-visibility | C7/C8 設定軸の分離と autonomy facet 表出 | `t3130-status-autonomy-facet`、`t431-structured-config` |
| docs-norms | FR-14/Q16 文書・ノルムの同一 intent 同梱 | `t3116-docs-mode-matrix` |
| semi-authority-projection | R-22 宣言 semi 下の gate-revision recovery 維持 | PR #3146 の追加・変更テスト |
| d6-investigation | FR-13 semi milestone 空振り承認の原因調査 | 調査 unit(実装差分は計測系) |

## 準備状況評価

- **build-ready**: はい。ビルドは 8 ハーネス全てで再現し、追跡ファイルを変えない。
- **test-ready**: はい。全 13 unit の実装は各 PR の CI(`ci-success` 集約ジョブ)green を経て着地済み。
- **deployment-ready**: 対象外。本 intent はデプロイ面を持たず、Operation フェーズは全ステージ SKIP。

## 既知の制約・申し送り

1. **ローカルフルスイートの 1 件の失敗は環境起因**: `tests/integration/t-approve-batch-presence-guard.integration.test.ts` が本 checkout でのみ 4 件失敗する。逐語は `Audit emission failed: OTel logs already bootstrapped for project dir <checkout> ... one workspace per process`。帰属の実測は `build-test-results.md` §帰属切り分け に転記。
2. **形式検証**: `formal-model-check` を handoff ステージとして先行実行済み。登録 4 モデル全てが `NOT_DETECTED`(詳細は `build-test-results.md` §形式検証)。
3. **性能テストは意図的に不在**: 数値目標を持つ性能 NFR が要件に宣言されていないため、目標なきベンチマークを発明していない(判定根拠と将来の再判定条件は `performance-test-instructions.md`)。
