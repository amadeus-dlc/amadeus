# Intent Backlog — 260810-swarm-directive-fixes

上流入力（consumes 全数）: [`intent-statement.md`](../intent-capture/intent-statement.md)。境界と完了定義は [`scope-document.md`](./scope-document.md) を正本とする。

## 優先順位

MoSCoW と risk-first を使う。利用頻度・工数の実測がないため WSJF / RICE の架空スコアは作らない。すべて Must だが、severity により #2833 系を先頭に置く。以下は proto-capability であり、正式な Unit 分割は units-generation が依存 DAG と競合面を実測して確定する。

| 順位 | ID | Proto-capability | MoSCoW | 依存 | 規模 | 完了価値 |
|---:|---|---|---|---|---|---|
| 1 | P1 | `report --result failed` と halt-and-ask 現行挙動の falling proof | Must | — | S | 4契約ギャップと exit 0 + error directive を固定する |
| 2 | P2 | Retry / Skip / Abort の Unit outcome を batch selector / cursor へ投影 | Must | P1 | L | Abort 再 dispatch を止め、3裁定を engine verb として閉じる |
| 3 | P3 | swarm / non-swarm / autonomous の遷移・終端回帰 | Must | P2 | M | 同根経路と安全停止を証明する |
| 4 | P4 | 7 consumer stage と producer-stage 解決 seam の機械棚卸し | Must | — | S | build-and-test だけの局所修正を防ぐ |
| 5 | P5 | placeholder / `consumes_absent` pinned contract の裁定とテスト契約更新 | Must | P4 | M | 実装前に互換性境界を確定する |
| 6 | P6 | N Unit × M artifact の required `consumes` fan-out | Must | P5 | L | 7 stage に全 Unit の実在入力を渡す |
| 7 | P7 | reviewer read scope と missing input の fail-open 解消 | Must | P6 | M | §12a reviewer が必須成果物を読めるようにする |
| 8 | P8 | Bolt ごとの検証・PR・convergence・leader 承認依頼 | Must | P3, P7 | M | 独立レビュー可能な配送証跡を完成する |

## Proto-Unit 候補

- **PU-A — Construction halt outcome projection（#2833）**: P1–P3。P1 / S2-CRITICAL。既存終端台帳の読者を設け、Retry / Skip / Abort と safe terminal を一つの遷移契約で閉じる。
- **PU-B — per-unit consume fan-out（#2834）**: P4–P7。P2 / S3-MAJOR / origin:bootstrap。pinned contract 裁定後、7 stage と reviewer scope を同根で閉じる。
- **配送横断条件**: P8 は Unit を新設する実装機能ではなく、各 Unit の Definition of Done。複数 Unit や無関係工程記録を1 PRに束ねない。

## 依存と並行化

P1→P2→P3 と P4→P5→P6→P7 は別系列である。共有 reverse-engineering 後、PU-A と PU-B は units-generation が確認した DAG に従って swarm 並行候補とする。P5 の裁定が未完なら PU-B の実装だけを止め、PU-A を不必要に止めない。

## Won't（今回）

- Stop hook 改修、新規 state、upstream-coverage sensor 改修。
- build-and-test 単独修正、Abort 単独修正、既存の stage skip / `[?]` を正式解とすること。
- 無関係リファクタ、generated surface のコミット、複数 Bolt の単一 PR 化、AI による PR merge。

## Definition of Ready

- P1 / P4 の現行挙動と同根面が reverse-engineering のコマンド出力から再現されている。
- P5 の pinned behavior ruling が明示されている。
- requirements が acceptance criterion と禁止事項をテスト可能な形で確定している。
- application-design / units-generation が共有ファイル競合と Unit dependency を明記している。
