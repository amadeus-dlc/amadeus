# Intent Backlog — live E2E Phase 2

Intent: `260804-live-e2e-phase2`  
上流入力: [intent-statement.md](../intent-capture/intent-statement.md)  
優先順位の正本: [scope-document.md](./scope-document.md)

## Prioritization Method

全Must項目をMoSCoWで固定し、その内部順序はrisk-firstとdependency-firstを組み合わせる。Kiro CLIの成立可能性は不確実性が高く、後続の設計境界を変え得るため最初に実測する。Kimi Codeは接続経路が明確であり、adapter testからlive journeyへ依存順に進める。

外部期限や信頼できる工数実測がないため、見かけの精度を作るWSJF/RICE数値は付与しない。詳細なUnit分解とBolt順序はReverse Engineering、Units Generation、Delivery Planningで確定する。

## Prioritized Proto-Units

| Order | ID | Proto-Unit | MoSCoW | Outcome | Dependencies |
|---:|---|---|---|---|---|
| 1 | P2-01 | Kiro CLI capability spike | Must | ACP/TUIの実行・認証・設定・終了・配布境界を実測し、直接接続または後続Issueの判断材料を得る | 承認済み`intent-statement.md`、既存共通contract |
| 2 | P2-02 | Kimi print adapter | Must | `kimi -p`を共通policy/lifecycleへ接続し、認証・設定・child env境界をadapter testで固定する | 既存共通contract |
| 3 | P2-03 | Kimi contract and live evidence | Must | contract testを適用し、opt-in live journeyをgreenにして実行証跡を残す | P2-02 |
| 4 | P2-04 | Kiro CLI closure | Must | ACP/TUIを直接接続して検証するか、阻害要因・推奨seam・受け入れ条件付き後続Issueを作成・linkする | P2-01 |
| 5 | P2-05 | Phase 2 traceability closure | Must | capability matrix、文書、テスト、live revision、後続IssueをIssue #1717の受け入れ条件へ対応づける | P2-03、P2-04 |

P2-01とP2-02は共有contract確認後に独立して進められる。P2-03はP2-02、P2-04はP2-01へ依存し、P2-05がPhase 2の統合完了点となる。

## Deferred Backlog

### Should

- S1: adapter固有の診断表示と保守者向けトラブルシューティングを整備する。
- S2: 認証・設定前提、opt-in方法、結果記録方法を利用者・保守者文書へ反映する。

### Could

- C1: 最小journeyを遅らせない追加live scenarioを加える。
- C2: capability matrixに基づく補助診断例を加える。

### Won't

- Kiro IDEのGUI/CDP。
- CursorとOpenCode。
- transport統一、通常CIでのlive起動、モデル出力完全一致、共通contractの弱体化。

## Dependency and Value Flow

```text
              ┌→ P2-01 Kiro spike → P2-04 Kiro closure ─┐
共通contract ─┤                                          ├→ P2-05 Phase 2 closure
              └→ P2-02 Kimi adapter → P2-03 live証跡 ───┘
```

最小価値はKimiの安全なlive journeyとKiro CLIの二択完了が同時に成立した時点で生じる。片方だけの完了や調査記録だけではPhase 2完了としない。

## Acceptance Trace

| Scope capability | Backlog coverage | Verification signal |
|---|---|---|
| M1 Kimi接続 | P2-02 | adapter integration test |
| M2 Kimi決定的テスト | P2-02、P2-03 | contract test、違反注入 |
| M3 Kimi live journey | P2-03 | opt-in live green revision |
| M4 Kiro実測 | P2-01 | capability evidence |
| M5 Kiro二択完了 | P2-04 | adapter/live evidenceまたは後続Issue link |
| M6 Phase 2証跡 | P2-05 | Issue #1717、matrix、文書、テストの相互参照 |
