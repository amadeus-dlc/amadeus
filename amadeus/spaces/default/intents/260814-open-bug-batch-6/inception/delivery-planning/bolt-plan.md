# Bolt Plan — 260814-open-bug-batch-6

上流: `unit-of-work.md` / `unit-of-work-dependency.md` / `unit-of-work-story-map.md`、`requirements.md`、`components.md`。スコープ self-fix(既存コードベースのインクリメンタル修正)のため walking-skeleton セレモニーは適用しない(org.md § Walking Skeleton — スケルトンをブートストラップすべき対象が存在しない)。Bolt 粒度は 1 Unit = 1 Bolt = 1 PR(project.md)。

## Bolt 1: landed-finalization(U-1 / #3062)

- Units: U-1
- Definition of Done: FR-1 (1)-(4) の受け入れ述語を全て実測合格(落ちる実証1セット含む)、PR 作成済み・required CI green・record checkpoint 同梱
- 確信仮説: merge queue 着地後の self record が正規経路で最終化できること(手動逃がしの根絶)
- 期待デモ: merged fixture での report(kind: landed)書込 → sensor pass の実測ログ

## Bolt 2: sensor-declaration(U-2 / #3026)

- Units: U-2
- Definition of Done: FR-2 受け入れ(投影 13→14 実測、宣言突合検査の落ちる実証)、PR 作成・CI green
- 確信仮説: 宣言1行+配線でセンサーが発火可能になり、同クラスの欠落に検査が付くこと
- 期待デモ: `bun run build` 後の `.claude/sensors/` 14 件の実測

## Bolt 3: docs-sensors-sync(U-3 / #3028、Bolt 2 の後)

- Units: U-3(依存: U-2 の宣言裁定)
- Definition of Done: FR-3 受け入れ(en/ja 14 行・同数・drift 検査の落ちる実証)、PR 作成・CI green
- 確信仮説: 件数変化に追随する検査が固定表の再 drift を防ぐこと
- 期待デモ: `grep -c '^| \`amadeus-'` = 14(en/ja)と欠落注入で赤くなる検査

## Bolt 4: worktree-gc-determinism(U-4 / #3031)

- Units: U-4
- Definition of Done: FR-4 (a)/(b)/(c) の該当分岐の受け入れ述語合格、record 成果物(一次証跡判定・棚卸し)、変更ありの場合 PR 作成・CI green
- 確信仮説: 既着地 retry の射程が観測失敗を覆うか否かが一次証跡で確定すること
- 期待デモ: 判定記録(覆う=是正0件根拠 / 覆わない=採用案の検証述語合格)

## Bolt 5: audit-sink-investigation(U-5 / #3032)

- Units: U-5
- Definition of Done: FR-5 の該当分岐(機序確定→是正+回帰テスト / 非再現→クローズ準備+申し送り)の受け入れ合格、record 成果物
- 確信仮説: 現行バイトで仮説機序が成立するか否かが scratch 再現で確定すること
- 期待デモ: 2-workspace scratch 構成の再現試行ログ

## バッチ構成(トポロジー準拠)

- バッチ1: Bolt 1 / 2 / 4 / 5(依存なし、並行可)
- バッチ2: Bolt 3(Bolt 2 の後)

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
