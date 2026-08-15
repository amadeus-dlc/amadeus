# Bolt Plan — 260814-open-bug-batch-6

上流: `unit-of-work.md` / `unit-of-work-dependency.md` / `unit-of-work-story-map.md`、`requirements.md`、`components.md`。スコープ self-fix(既存コードベースのインクリメンタル修正)のため walking-skeleton セレモニーは適用しない(org.md § Walking Skeleton — スケルトンをブートストラップすべき対象が存在しない)。Bolt 粒度は 1 Unit = 1 Bolt = 1 PR(project.md)。

## Bolt landed-finalization: FR-1(U-1 / #3062)

- **Units:** `landed-finalization`
- Definition of Done: FR-1 (1)-(4) の受け入れ述語を全て実測合格(落ちる実証1セット含む)、PR 作成済み・required CI green・record checkpoint 同梱
- 確信仮説: merge queue 着地後の self record が正規経路で最終化できること(手動逃がしの根絶)
- 期待デモ: merged fixture での report(kind: landed)書込 → sensor pass の実測ログ

## Bolt sensor-declaration: FR-2(U-2 / #3026)

- **Units:** `sensor-declaration`
- Definition of Done: FR-2 受け入れ(投影 13→14 実測、宣言突合検査の落ちる実証)、PR 作成・CI green
- 確信仮説: 宣言1行+配線でセンサーが発火可能になり、同クラスの欠落に検査が付くこと
- 期待デモ: `bun run build` 後の `.claude/sensors/` 14 件の実測

## Bolt docs-sensors-sync: FR-3(U-3 / #3028、sensor-declaration の後)

- **Units:** `docs-sensors-sync`(依存: U-2 の宣言裁定)
- Definition of Done: FR-3 受け入れ(en/ja 14 行・同数・drift 検査の落ちる実証)、PR 作成・CI green
- 確信仮説: 件数変化に追随する検査が固定表の再 drift を防ぐこと
- 期待デモ: `grep -c '^| \`amadeus-'` = 14(en/ja)と欠落注入で赤くなる検査

## Bolt worktree-gc-determinism: FR-4(U-4 / #3031)

- **Units:** `worktree-gc-determinism`
- Definition of Done: FR-4 (a)/(b)/(c) の該当分岐の受け入れ述語合格、record 成果物(一次証跡判定・棚卸し)、変更ありの場合 PR 作成・CI green
- 確信仮説: 既着地 retry の射程が観測失敗を覆うか否かが一次証跡で確定すること
- 期待デモ: 判定記録(覆う=是正0件根拠 / 覆わない=採用案の検証述語合格)

## Bolt audit-sink-investigation: FR-5(U-5 / #3032)

- **Units:** `audit-sink-investigation`
- Definition of Done: FR-5 の該当分岐(機序確定→是正+回帰テスト / 非再現→クローズ準備+申し送り)の受け入れ合格、record 成果物
- 確信仮説: 現行バイトで仮説機序が成立するか否かが scratch 再現で確定すること
- 期待デモ: 2-workspace scratch 構成の再現試行ログ

## バッチ構成(トポロジー準拠)

- バッチ1: landed-finalization / sensor-declaration / worktree-gc-determinism / audit-sink-investigation(依存なし、並行可)
- バッチ2: docs-sensors-sync(sensor-declaration の後)

```yaml
bolts:
  - name: landed-finalization
    units: [landed-finalization]
    batch: 1
  - name: sensor-declaration
    units: [sensor-declaration]
    batch: 1
  - name: worktree-gc-determinism
    units: [worktree-gc-determinism]
    batch: 1
  - name: audit-sink-investigation
    units: [audit-sink-investigation]
    batch: 1
  - name: docs-sensors-sync
    units: [docs-sensors-sync]
    batch: 2
```
