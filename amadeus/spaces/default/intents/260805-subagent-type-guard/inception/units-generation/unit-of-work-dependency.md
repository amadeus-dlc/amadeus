# Unit of Work — Dependency

**上流入力(consumes 全数)**: `component-dependency`(C 間依存グラフ — 本書のエッジの導出元)/ `components`(Unit への C 割付)/ `component-methods`(共有シンボル `classifyAgentType` 等の提供/消費関係)/ `services`(共通運用契約 — 依存に影響しない確認)/ `decisions`(ADR-6 — U3 が U2 に依存しない根拠)/ `requirements`(FR 間の独立性)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 依存エッジ(機械可読 — parseBoltDag 用)

```yaml
units:
  - name: u1-detection-skeleton
    kind: library
    depends_on: []
  - name: u2-model-attribution
    kind: library
    depends_on: [u1-detection-skeleton]
  - name: u3-subagent-stats
    kind: service
    depends_on: [u1-detection-skeleton]
```

kind の根拠: U1/U2 は core ライブラリ層(純関数 + hook 配線)への追加 = `library`、U3 は独立実行の CLI = `service`(nfr-design の produces_kinds が kind 別に適用成果物を絞る — `cid:nfr-design:c1-engine-produces-all-five`)。

## エッジの根拠

| エッジ | 種別 | 根拠 |
|---|---|---|
| U2 → U1 | 真の依存 | U2 は U1 が新設するモジュール(`amadeus-subagent-observability.ts`)へ C-3 を追加し、U1 が確立する registry optional 追加様式・fail-open ヘルパ・配線点を再利用する。U1 未着地では U2 の差し込み先が存在しない |
| U3 → U1 | 真の依存 | U3(集計 CLI)は `classifyAgentType`(U1)を import し、`Type Verdict` 属性の無い旧 audit 行を集計時に分類する(ADR-6 / component-methods C-7) |
| U3 ⊥ U2 | **依存なし** | U3 は Model 属性の無い行を `unresolved` として計数する設計(ADR-5)のため、U2 未着地でも全機能が動作する。U2 着地後は model 別内訳が自然に充実する |

## 並行性の含意(delivery-planning への入力)

- U1 は単独先行(walking-skeleton 候補 — self-feature の最初の Bolt はゲート付き)
- U1 着地後、**U2 と U3 は並行実装可能**(相互依存なし。編集面も非交差: U2 = observability モジュール + lib/hook/registry、U3 = 新設 CLI + テスト)
- 循環なし(3ノード・2エッジの DAG)
