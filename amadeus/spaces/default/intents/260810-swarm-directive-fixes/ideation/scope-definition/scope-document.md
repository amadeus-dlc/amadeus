# Scope Document — 260810-swarm-directive-fixes

上流入力（consumes 全数）: [`intent-statement.md`](../intent-capture/intent-statement.md)。本書は同文書が参照する [Issue #2833](https://github.com/amadeus-dlc/amadeus/issues/2833)、[Issue #2834](https://github.com/amadeus-dlc/amadeus/issues/2834)、および両 Issue の全クロスレビューコメントを境界根拠とする。

## 目的と価値境界

per-unit Construction の成果物台帳と裁定台帳を downstream engine 判断へ忠実に投影し、次の2つを同時に満たす。

1. required input は placeholder のままではなく、対象となる全 Unit の実在パスとして consumer と reviewer に届く。
2. Retry / Skip / Abort は選択後の Unit pool と workflow cursor に反映され、Abort 後の再 dispatch loop を終端できる。

これは1つの intent である。#2833 と #2834 は共有 seam を持つ一方、正式な独立実装境界は units-generation の Unit、配送境界は Bolt ごとの PR として表現する。

## In Scope

| ID | 能力 | 完了境界 | 根拠 |
|---|---|---|---|
| S1 | per-unit required input fan-out | 非 per-unit consumer の `consumes: string[]` が N Unit × M artifact の実在パスを列挙し、未解決 `{unit-name}` を残さない | #2834 コメント、intent-statement 成功指標1・2 |
| S2 | 同根7 stage の閉包 | build-and-test / ci-pipeline / performance-validation / observability-setup / incident-response / deployment-pipeline / environment-provisioning を機械棚卸しし、同一契約で検証する | #2834 独立2名の同一抽出、`cid:code-generation:same-root-inventory` |
| S3 | placeholder / absent 契約の裁定 | `amadeus-directive.ts` の明文契約と t116 test 16 の pinned behavior を実装前に裁定し、選ばれた契約とテストを一致させる | #2834 コメント、`cid:reverse-engineering:c1-pinned-behavior-ruling` |
| S4 | reviewer scope の fail-open 解消 | 展開済み per-unit input が reviewer runtime の on-disk read scope に入り、必須成果物が無音で全脱落しない | #2834 コメント、intent-statement 成功指標3 |
| S5 | Unit 裁定の engine 投影 | Retry / Skip / Abort が既存終端台帳・監査証跡から batch selector と cursor に反映される | #2833 コメント、intent-statement 成功指標4・5 |
| S6 | 安全停止と再開契約 | autonomous を含む swarm / non-swarm で、Abort は同じ `invoke-swarm` を再提示せず安全な終端へ到達し、Retry / Skip も明示遷移を持つ | #2833 コメント、intent-statement 成功指標5・6 |
| S7 | 回帰証明と配送規律 | TDD の falling proof、3裁定の遷移テスト、exit 0 + error directive の拒否確認、Bolt ごとの PR と convergence 証跡を残す | ユーザー制約、`cid:code-generation:tdd-default-with-narrow-exceptions`、`cid:build-and-test:c9` |

全7項目が Must。Should / Could へ落とすと、同根6 stage、reviewer fail-open、または Retry / Skip / non-swarm が未閉包になり、Issue コメントで確定した受け入れ境界を破る。

## Out of Scope

- Stop hook の変更。現行 `parked` 終端処理は全モードを既に許可しており、欠陥は engine 発行経路にある。
- 新規 workflow state の追加。既存の終端台帳と audit-backed projection を優先して設計する。
- upstream-coverage sensor の変更。同 sensor は directive path ではなく artifact slug を参照し、本欠陥の影響を受けない。
- build-and-test だけの局所修正、Abort だけの局所修正、checkbox `[?]` や stage-level skip を正式な代替契約とすること。
- 無関係な `amadeus-orchestrate.ts` リファクタ、generated self-install surface / `dist/` のコミット、Operation stage の実行。
- PR の自動マージ。マージは leader セッションへの報告後、ユーザー承認を得た人間が行う。

## 制約と裁定待ち

- `scope=self-feature` は #2833 が engine の新しい停止遷移契約を必要とするため、ユーザー裁定済みで変更しない。
- #2834 の受け入れ条件3と「placeholder path を `consumes_absent` に載せない」現行契約の衝突は、実装前に明示裁定する。裁定前に互換性の前提を置かない。
- #2833 は新規 state や Stop hook 変更を前提にしない。`BOLT_FAILED Reason=aborted`、`SWARM_BATON_RETURNED`、監査バックの Unit pool projection、終端 outcome を読み手へ接続する案を起点とする。
- テストは `report --result failed` の拒否を非ゼロ exit ではなく、exit 0 + error directive として assert する。
- 実装が承認済み要件・設計から逸脱する必要を認識した時点で停止し、裁定を仰ぐ。

## 依存・シーケンス

```text
共有 reverse-engineering
  ├─ #2833: halt outcome projection ─────────┐
  └─ #2834: pinned contract 裁定 → fan-out ─┼─ 統合検証・PR convergence
                                             ┘
```

- topological dependency: 両能力は共有 seam 棚卸し後に独立可能。ただし #2834 は S3 の裁定が hard gate。
- economic priority: risk-first で #2833（P1 / S2-CRITICAL）を先頭に置く。
- execution shape: units-generation の DAG が許す Bolt を Construction swarm で並行する。共有ファイル競合は隔離 worktree と PR 単位で解消する。
- deadline: 固定日なし。severity と dependency を順序根拠とする。

## 成功基準

1. 7 stage の directive に未解決 `{unit-name}` が残らず、全 Unit の required input が決定的順序で列挙される。
2. missing / optional input の契約は S3 裁定と一致し、既存 pinned test は保持または明示改訂される。
3. reviewer read scope が展開済み required input を読み、欠落時は無音で fail-open しない。
4. Retry / Skip / Abort の各遷移テストが swarm / non-swarm の対象経路を覆い、Abort 後に同一 batch が再提示されない。
5. `report --result failed` の現行拒否を exit 0 + error directive として再現する failing test から実装を開始する。
6. build、lint、typecheck、関連 test、および必要な full-suite 再実行が成功する。
7. 1 intent の追跡を維持しつつ Bolt ごとに独立 PR を作り、各 PR で convergence loop を完了する。

## Value Stream Map

| 利用者の痛み | 能力 | 検証可能な出力 | 利用者価値 |
|---|---|---|---|
| consumer / reviewer が実入力を読めない | S1–S4 | 実 Unit path 列挙、欠落検知、7 stage 回帰 | 実行とレビューの入力が一致する |
| Abort 後も swarm が再提示される | S5–S6 | 3裁定の状態遷移、終端 directive | 選択した停止意味論が忠実に実行される |
| 局所修正が同根欠陥を残す | S2・S7 | 全数棚卸し、TDD、PR convergence | 再発と silent green を防ぐ |

## Change Control

S1–S7 の削除、Stop hook / 新規 state の追加、Unit 間依存の新設、または Bolt への複数 Unit 混載は scope change とする。発見時は実装せず停止し、Requirements / Design 成果物の改訂とユーザー裁定を先に行う。
