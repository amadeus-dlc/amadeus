上流入力(consumes 全数): requirements, components, unit-of-work, unit-of-work-dependency, unit-of-work-story-map, team-practices

# Bolt Plan — 260725-kimi-harness

unit-of-work-dependency.md の DAG に従う7 Bolt(1 Unit = 1 Bolt = 1 PR)。直列実行(並列不可の理由は risk-and-sequencing-rationale.md)。requirements.md の FR 対応は unit-of-work-story-map.md、team-practices の Walking Skeleton に従い Bolt 1 は単独・ゲート付き。

## Bolt 1: kimi-harness-definition(Walking Skeleton)

- **Units**: U1
- **Walking Skeleton**: Yes — harness 定義 → packager → dist 生成 → drift guard という、配布経路の全層を通す最小スライス(単独・ゲート付き)
- **DoD**: `bun scripts/package.ts kimi` が `dist/kimi/` を生成、`--check` exit 0、dist 構造 smoke green、セッションスキル6本同梱を確認
- **Confidence hypothesis**: manifest 宣言だけで packager の全パイプライン(coreDirs 投影・runner-gen・graph compile)が `.kimi-code` に通ることを証明する
- **Demo**: 生成された dist/kimi ツリーと `--check` の出力

## Bolt 2: kimi-hook-adapter

- **Units**: U2
- **DoD**: adapter+lib 実装、全9イベントの payload live capture と変換表固定、契約テスト green(採取 payload で core hook 効果を断言)、fail-open 経路の検証
- **Confidence hypothesis**: Kimi の実機 payload が Claude 契約へ正規化でき、presence mint・audit・stop block が core hook 経由で動くことを証明する(最大リスク R1 の解消)
- **Demo**: 契約テストの実行結果と capture した payload の対応表

## Bolt 3: setup-hooks-merge

- **Units**: U3
- **DoD**: managed block の冪等マージ(add/replace/noop)・既存ブロック保持・マーカー限定除去・バックアップ・壊れた TOML の loud fail が単体テストで green。plan report 差分表示 + wizard confirm が既存流儀どおり動く
- **Confidence hypothesis**: ユーザーの config.toml を壊さずに managed block を出し入れできることを証明する
- **Demo**: 単体テストと dry-run 表示の出力

## Bolt 4: core-harness-enums

- **Units**: U4
- **DoD**: doctor arm(kimi)が4チェックを実行、`resolve --harness kimi` が subagent floor を返す(分岐テスト green)、`amadeus-harness.ts` の4定数に kimi が入る
- **Confidence hypothesis**: サンクション済み3箇所の列挙追加で doctor/swarm/検出が kimi を認識することを証明する
- **Demo**: `--doctor` の出力と resolve 分岐テスト

## Bolt 5: distribution-enumeration

- **Units**: U5
- **DoD**: setup/plugin-projection/promote-self/detect-ci-changes の列挙追加、`bun run dist:check` と `promote:self:check` green、ルート `.kimi-code/` 生成、実機 `/skill:amadeus` 起動・hook 発火・doctor パス
- **Confidence hypothesis**: エンドユーザーの導入経路(setup CLI)と本リポジトリの dogfood 経路が両方通ることを証明する
- **Demo**: dogfood セッションの動作記録

## Bolt 6: kimi-live-journey

- **Units**: U6
- **DoD**: `kimi-print-drive` 新規作成、`AMADEUS_KIMI_PRINT_LIVE=1` ゲートで journey 1本以上を実装しローカル実走 green(決定的 tier では skipReason で skip)
- **Confidence hypothesis**: kimi 実機でワークフローの基本経路(起動・status 表示)が回ることを継続検証できることを証明する
- **Demo**: 実走ログ(成功記録)と skip 時の skipReason 出力

## Bolt 7: kimi-harness-docs

- **Units**: U7
- **DoD**: `docs/guide/harnesses/kimi-code.md` + `.ja.md` 新設、README 表追加。前提・配線(自動/手動)・制約を実測どおりに記述
- **Confidence hypothesis**: ユーザーが docs どおりに導入・配線・doctor 実行を再現できることを証明する
- **Demo**: ドキュメントのレビュー済み diff
