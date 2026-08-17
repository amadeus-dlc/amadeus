# Unit of Work Dependency — intent 260816-priority-bug-batch-3

unit-of-work.md の 5 unit 間のトポロジー(依存 DAG)。本書はトポロジーのみを記述し、実装順・クリティカルパスの選定は 2.8 delivery-planning の経済判断へ委ねる。

## 依存 DAG

実装依存のエッジは **1 本**: `milestone-presence`(U4)は `autonomy-refusal-idem`(U3)に依存する。根拠: decisions.md ADR-1 実装契約2 — interactionKind と human-required 宣言を `ProductionAutonomyContext` の戻り値として1定義から供給する形は、ADR-2(U3)が `productionStageAutonomy` を純粋読取化し戻り値を整えることを前提とする(cg2-agreeing-predicate-drift の複製防止)。

他の 4 unit(prc-finalization / election-append / autonomy-refusal-idem / source-work-probe)は相互に実装依存を持たない。

```yaml
units:
  - name: prc-finalization
    kind: library
    depends_on: []
  - name: election-append
    kind: library
    depends_on: []
  - name: autonomy-refusal-idem
    kind: library
    depends_on: []
  - name: milestone-presence
    kind: library
    depends_on: [autonomy-refusal-idem]
  - name: source-work-probe
    kind: library
    depends_on: []
```

## 統合点

- U3 → U4: `ProductionAutonomyContext` の戻り値(human-required 宣言 + interactionKind)。U3 が供給面を確定し、U4 が消費する。新規公開 API ではなく既存戻り値型の拡張
- U1 内部: ADR-4 の override 記録は ADR-3 の attestation ベース束縛に乗る(同一 unit 内で完結)
- 共有ファイル(実装依存ではない write scope の交差): `amadeus-state.ts` を U3(gate-start emit 移設)/ U4(presence 結線)/ U5(プローブ追加)が触る — 行域は非重複(component-dependency.md のファイル交差表)。マージ衝突・coverage 計測の相互干渉を避ける直列化は 2.8 の判断材料

## 並行開発の機会

- 依存のない unit 集合: {prc-finalization, election-append, autonomy-refusal-idem, source-work-probe} は任意の並行・順序が可能(トポロジー上)
- prc-finalization と election-append は他と write scope の交差もゼロ(plugin 境界 / election store 内で完結)— 完全並行可能
- autonomy-refusal-idem / milestone-presence / source-work-probe は `amadeus-state.ts` の write scope を共有する — 並行時は worktree 分離 + 直列着地が前提(economic sequencing は 2.8)
