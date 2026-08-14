# Intent Backlog(proto-Units)— 260814-plugins-rename-drift

上流入力: `ideation/intent-capture/intent-statement.md` と `scope-document.md`。優先度は MoSCoW。規模は行数見積り(数値必須 — inception ガードレール)。正式な Unit 分割・Bolt 編成は units-generation / delivery-planning 段で確定する。

## proto-Unit 一覧(dependency-first 順)

| # | proto-Unit | 対応 | MoSCoW | 依存 | 推定規模(行) | 備考 |
|---|---|---|---|---|---|---|
| PU-1 | github-pr-convergence 改名(移設+全消費者同期+残存参照検査+移行手当て) | #2996 | Must | なし | 変更 ~400(git mv 13 ファイル別枠、テスト 19 件のパス更新含む) | 主要リスク: scope-bindings キーの silent 退行。検証追加の要否を設計段で実測判定 |
| PU-2 | plugin.settings 設定機構(スキーマ宣言・階層解決・fail-closed 両面) | #2997 core | Must | PU-1 とは独立(規約一貫性のため後続) | 新規 ~600 + テスト ~500 | 落ちる実証4項。env 宣言スキーマの先行着地可否は設計段裁定 |
| PU-3 | git-drift プラグイン(センサー実装+seams 結線+落ちる実証) | #2997 plugin | Must | PU-2(設定値の実消費者) | 新規 ~500 + テスト ~400 | stages:[]+sensors+seams 合成形状は前例 0 件 — conformance 実測必須 |

```yaml
proto_units:
  - id: PU-1
    issue: 2996
    moscow: must
    depends_on: []
    est_lines: 400
  - id: PU-2
    issue: 2997
    side: core
    moscow: must
    depends_on: []
    est_lines: 1100
  - id: PU-3
    issue: 2997
    side: plugin
    moscow: must
    depends_on: [PU-2]
    est_lines: 900
```

## 再利用棚卸し(新規機構の導入根拠)

- PU-1: 新規機構なし(git mv + 既存ゲート群で検証)
- PU-2: 既存の階層解決(`amadeus-config.ts` LAYER_ORDER)と fail-closed 検証基盤へ相乗り。新規は settings スキーマ宣言と検証のみ(1 キー追加+スキーマ駆動検証 — Issue クロスレビュー実測)
- PU-3: `amadeus-worktree.ts` base 鮮度ガード(比較ロジック・文言・逃がし)と `advisories` 宣言機構を設計段で棚卸しし、二重実装を回避

## PR 粒度

Bolt ごとに 1 PR(ノルム cid:units-generation:c1)。#2996 = 1 Bolt 見込み、#2997 = Unit 分割に応じ 1〜2 Bolt(delivery-planning 段で確定)。各 PR はマージ前に人間承認必須。
