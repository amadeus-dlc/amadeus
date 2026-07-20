# Unit of Work Dependency — 260719-ballot-failclosed-amend

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md

## 依存グラフ(parseBoltDag 用 edge block — per-unit-loop-activation (a))

```yaml
units:
  - name: ballot-acceptance-failclosed
    depends_on: []
```

単一 Unit のため内部依存なし。

## 外部依存(Unit 間でなく intent 間)

- **e1 の #1261 intent(tally choice 導出)**: 直列合意(decisions.md「並行 intent 境界の出典」節)により e1 先行着地 → U1 の code-generation で origin/main へ base-advance-regrounding。交差核心 = tally(model.ts:321-337)/ verify recompute(election.ts:440)。E-TCRRA4 裁定(A)により unknown-choice 分類は e1 側 PR に含まれ、U1 は再接地時に自分の invalid-timestamp 分類とラダー統合する(挿入位置原則: 識別子系 = unknown-voter 直後 / 内容系先頭 = invalid-timestamp — e2 留保として E-TCRRA4 へ転記済み)。
- **norm PR #1265**: ゲート運用の追補であり U1 実装への依存なし(レビュアー ディスパッチ文言に適用済み)。

## テキストフォールバック

U1(単独)→ 外部: e1 #1261 PR の main 着地(CG 段の再接地条件)。循環なし。
