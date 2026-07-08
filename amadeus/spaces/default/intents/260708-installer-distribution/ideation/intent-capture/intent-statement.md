# Intent Statement — インストーラの実装(installer-distribution)

> ステージ: intent-capture (Ideation) / 作成: 2026-07-08 / モード: Grilling(5問、全問回答済み)
> 出典: `intent-capture-questions.md` の合意済み回答(Q1〜Q5)。前 intent(260706-installer-impl、record 削除済み・git 履歴に保存)の 2026-07-07 グリリング合意を土台に、layout-normalization intent(260707)完了後の状態へ更新して再確認した。

## Problem Statement

Amadeus フレームワークの現行配布方式は「ユーザーが `dist/<harness>/` を自プロジェクトへ手動コピーする」(例: `cp -r dist/claude/.claude/ your-project/.claude/`)である。この方式には3つの構造的問題がある(出典: Q1):

1. **初回導入の摩擦** — 手動コピーが煩雑で、オンボーディングの障壁になっている
2. **バージョン更新の困難さ** — 既存導入先のアップグレード手段が存在せず、パッチ版が頻繁に積み上がるリリース運用のもとで、古いコピーが導入先に取り残される
3. **導入ミス** — コピー漏れ・上書き事故・ハーネス取り違えなどのヒューマンエラーを防ぐ仕組みがない

インストーラはこの3点(導入・更新・安全性)を包括的に解決する。

## Target Customer

(出典: Q2)

- **新規ユーザー** — Amadeus を初めて試す外部の OSS 利用者。リポジトリをクローンせずに1コマンドで導入できるようになる
- **既存ユーザー** — すでに導入済みでバージョンアップしたいユーザー。自身のカスタマイズ(ユーザー所有ファイル)を失わずに更新できるようになる

組織内の複数プロジェクト一括展開(プラットフォームエンジニア向け)は、要件肥大化を避けるため**初回スコープから除外**する。

## Success Metrics

(出典: Q3。いずれも測定・検証可能)

| # | 指標 | 検証方法 |
|---|------|----------|
| 1 | 新規プロジェクトへの導入が **1コマンド・1分以内** で完了する | E2E テストで検証 |
| 2 | README の**手動コピー手順のドキュメントが不要**になる | README から `cp -r` 手順が消えることを確認 |
| 3 | 既存導入先が**既存カスタマイズを失わずに**更新できる | 更新前後でユーザー所有ファイルが不変であることをテストで検証 |

## Initiative Trigger

(出典: Q4。確信度: 高)

**リリース頻度の上昇+パッケージ化の既定路線化。** パッチ版が頻繁に積み上がりマイナーカットで統合する運用が定着した結果、手動コピー方式では既存導入先が古いバージョンに取り残される問題が構造的に発生している。さらに layout-normalization intent(260707)が `packages/framework`(`@amadeus-dlc/framework`)を新設し、`packages/setup` をこの intent の成果物として予約したことで、配布のパッケージ化はすでに既定路線となった。更新配布の手段が今、必要である。

## Initial Scope Signal

(出典: Q5)

- **スコープ**: `installer-distribution`(composed、25/32 EXECUTE、Standard 深度)— compose ゲートで承認済み
- **提供形態**: npm 公開 CLI + `bunx`/`npx` ワンライナー(クローン不要導入)
- **実装の置き場所**: `packages/setup`(`@amadeus-dlc/setup`)として bun workspace に新設 — layout-normalization が予約済みの席に着く
- **対象ハーネス**: 全4種(claude / codex / kiro / kiro-ide)、ユーザー選択式。自動検出は行わない
- **衝突ポリシー**: 非破壊マージがデフォルト(`amadeus-*` プレフィックスのフレームワーク所有ファイルのみ更新、ユーザーファイルには触れない)。`--force` フラグで完全上書き
- **前提条件**: npm への公開(現状 root・`packages/framework` とも `private: true`)はこのイニシアチブの前提 — 実現可能性(パッケージ名確保・公開権限)は feasibility ステージで検証する

## Assumptions & Open Points

- 【前提】npm への公開権限・パッケージ名(`@amadeus-dlc` スコープ)の確保は未確認 — feasibility ステージで検証すべき制約
- 【前提】`amadeus-*` プレフィックス規約がフレームワーク所有ファイルの網羅的な判定基準として機能すること(`.claude/settings.json` などプレフィックスを持たないファイルの扱いは requirements-analysis で精査)
- 【注記】パッケージ自身のバージョンライフサイクルと公開物の実ツール検証(`npm pack --dry-run` 等)は、project.md の是正事項(requirements-analysis:c4)により requirements でテスト可能に固定する
