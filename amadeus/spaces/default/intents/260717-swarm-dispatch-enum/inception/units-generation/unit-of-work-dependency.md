# Unit of Work Dependency — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`。

## 依存の導出

依存は `component-dependency.md` の C1 起点位相と scope Capability Dependencies(S-02 → S-03〜S-06 → S-07 → S-08/S-09)の写像。3 Unit 直列 — U2 は U1 の三値語彙・resolve 契約なしに配線できず、U3 は配線済み挙動のみを文書・生成物へ確定する(検証済み契約だけを配布 — scope Delivery Strategy 5)。

## 機械可読エッジブロック

runtime compile の bolt_dag 入力(この YAML が正、以下は可視化):

```yaml
units:
  - name: driver-contract-core
    depends_on: []
  - name: harness-wiring
    depends_on: [driver-contract-core]
  - name: docs-and-parity
    depends_on: [harness-wiring]
```

```mermaid
graph LR
  U1[driver-contract-core] --> U2[harness-wiring] --> U3[docs-and-parity]
```

テキスト代替: driver-contract-core → harness-wiring → docs-and-parity(一本鎖)。

## 並行実装ノート

3 Unit は直列依存のため swarm 並行 fan-out の対象外(バッチ=1 unit ずつ)。ファイル交差(c6): U1=amadeus-swarm.ts/amadeus-audit.ts/tests、U2=harness/*/SKILL・emit・onboarding/tests、U3=docs/dist — 正本面の交差なし(dist 再生成は U3 に集約)。

## Cross-unit 決定(construction 段の追記 — 申告付き)

- CU-1(2026-07-18、U1 nfr-design レビュー是正で登録): C-15/C-14 開示の**禁止フレーズ集合の canonical は U1 `driver-contract-core/nfr-design/reliability-design.md` の RD-4**(フレーズ単位 6 句)。U2(RNR-W2/SNR-W2)・U3(RNR-D2/SNR-D2)の nfr-design/検証はこの集合を参照し、独立再定義しない。consumes 宣言外の cross-unit 参照であるため本欄を正規の参照経路とする(U2/U3 の ND 起草時は本欄経由で RD-4 を読む)
