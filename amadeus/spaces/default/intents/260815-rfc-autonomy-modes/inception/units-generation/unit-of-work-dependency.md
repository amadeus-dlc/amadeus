# Unit Dependency — intent 260815-rfc-autonomy-modes

> 本書は依存関係(実装依存と直列化制約)の事実のみを記録する。実装順・クリティカルパスの選定は delivery-planning(2.8)の経済的シーケンシングに委ねる。

## 依存表

| Unit | blockedBy(実装依存 — 理由) | 直列化のみ(ファイル/面共有 — 依存ではない) |
|---|---|---|
| U1 recommendation-core | — | U2/U5(intent-autonomy.ts)、U6/U8/U11(bolt.ts) |
| U2 presence-detection | — | U1/U5(intent-autonomy.ts) |
| U3 waiting-interruption | U1(waiting payload = RecommendationOutcome)、U2(対話性判定が admission の前提) | U5(orchestrate.ts) |
| U4 interactive-carveout | U2(同一ソースの対話判定)、U3(非対話 arm の倒し先) | — |
| U5 semi-authority-projection | U1(裁定順序 1 の表現)、U3(park guard 廃棄が先行 — 誤順で semi が park 能力を失う) | U2(intent-autonomy.ts)、U7(実効値関数の消費側) |
| U6 presence-closure | U5(C13 は allowsOccurrence 系 — U5 が書き換える同一 interaction 面の新意味論に対して実装する。設計 component-dependency の「C5+C6+C13 同段直列」制約) | U1/U8/U11(bolt.ts) |
| U7 config-visibility | U2(C8 `statusAutonomyFacet` が C3 実効判定を消費)、U5(同 — C5/C6 の実効値関数を消費) | — |
| U8 completion-report | U1(AUTO_DECIDED の新 outcome 種を集計対象に含む) | U6/U11(bolt.ts) |
| U9 s13-zero | — | — |
| U10 merge-provenance | — | — |
| U11 grant-ceremony | — | U1/U6/U8(bolt.ts) |
| U12 docs-norms | U1〜U11(全裁定・全実装の確定後に文書一致を検査するため) | — |
| U13 d6-investigation | — | — |

- 循環なし(blockedBy グラフは DAG — U12 が唯一の全依存シンク)。
- 「直列化のみ」は同一ファイル/面の変更衝突回避であり、意味論上の依存ではない(delivery-planning が Bolt 順序として固定する)。
- **設計行列セルの非 blocking 判定(§12a iteration-2 FOLLOW-UP の disposition)**: (1) C5→C7「trigger 導出」セル — U5 が読むのは mode 値(state 由来)だけで、`deriveSoloElectionTrigger` は C7 が**新設**する純関数。U5 実装時は旧キー無視の mode 直読で自足し、C7 の完成を待たない(逆向き depends_on 不要 — config キーは静的リテラルで C7 実装なしに参照可能)。(2) C2→C3 セル — 梯子の contested 分岐先(対話/非対話)は C3 の判定を**実行時に**消費するが、U1 の実装・テストは分岐先を seam(注入)で扱えるため build-blocking ではない(統合は U3/U4 で検証)。(3) C10→C1「0件=unique相当」セル — 概念上の語彙対応のみで、U9 は RecommendationOutcome 型を import しない(surface digest 判定で自足)。いずれも blocking edge へ昇格させない判定を明示しておく。

## 機械可読エッジブロック

```yaml
units:
  - name: recommendation-core
    kind: library
    depends_on: []
  - name: presence-detection
    kind: library
    depends_on: []
  - name: waiting-interruption
    kind: library
    depends_on: [recommendation-core, presence-detection]
  - name: interactive-carveout
    kind: library
    depends_on: [presence-detection, waiting-interruption]
  - name: semi-authority-projection
    kind: library
    depends_on: [recommendation-core, waiting-interruption]
  - name: presence-closure
    kind: library
    depends_on: [semi-authority-projection]
  - name: config-visibility
    kind: library
    depends_on: [presence-detection, semi-authority-projection]
  - name: completion-report
    kind: library
    depends_on: [recommendation-core]
  - name: s13-zero
    kind: library
    depends_on: []
  - name: merge-provenance
    kind: library
    depends_on: []
  - name: grant-ceremony
    kind: library
    depends_on: []
  - name: docs-norms
    kind: spec
    depends_on: [recommendation-core, presence-detection, waiting-interruption, interactive-carveout, semi-authority-projection, presence-closure, config-visibility, completion-report, s13-zero, merge-provenance, grant-ceremony]
  - name: d6-investigation
    kind: spec
    depends_on: []
```

## 統合ポイント

- U1 → U3/U4/U5/U8: `RecommendationOutcome` 型(amadeus-recommendation.ts の公開面)
- U2 → U3/U4/U7: 対話性の実効判定関数(単一ソース — UI 真実性)
- U3 → U4/U5: waiting 状態・park guard 廃棄後の state 契約
- U5 → U6/U7: allowsOccurrence の新意味論・投影/実効値関数
- 全 code Unit → 共有台帳: `tests/.coverage-registry.json`(新規テスト時 regen)、event-registry + audit-format.md(U3 の新イベント 2 種)、`tests/.coverage-patch-allowlist.json`(交差時のみ再アンカー)
