# Risk and Sequencing Rationale — 260807-merged-pr-convergence

上流入力(consumes 全数): `requirements`(NFR-4 台帳波及・Constraint)、`unit-of-work-story-map`(スライス順)、`bolt-plan`(姉妹成果物)、`components` / `unit-of-work` / `unit-of-work-dependency`(参照 — 単一 Bolt 順序の根拠)。

## Bolt 内順序のリスク制御(cid:delivery-planning:intra-bolt-order-as-risk-control)

スライス順 1→6(観測 → 判定 → I/O → 検証 → 文書)は次のリスクを構造的に消す:

1. **fail-closed 縮退の防止**: PrLifecycleState の閉集合 parse(スライス1、AC-1b の throw 実証)を最初に固定してから landed 分岐(スライス3-4)を書く — 逆順だと未知 state の素通し窓が一時的に生まれる。
2. **write⇔check 非対称の防止**: renderReport(スライス4)→ sensor checkLanded(スライス5)を同一 Bolt 内で連続実装し、landed report が書けるのに検査語彙が無い(または逆)の中間状態を PR に残さない。
3. **既存挙動退行の早期検出**: 各スライスで t446/t448 の無改変 green を確認(AC-2c)— 統合後に一括判明する形を避ける。

## RAID(実測ベース)

| 種別 | 項目 | 対応 |
|---|---|---|
| Risk | allowlist 行ピンの無音転位(NFR-4) | 機械 remap + reason 直読照合 + span 膨張検査を PR 前の定型に。census は最終 base(実測: allowlist :6365-6398 に既存3ファイルエントリ) |
| Risk | t481/t482 の採番衝突(base 前進) | PR 発行前に固定 base SHA の tests/ 実測で再確認(`c1-tnnn-collision-on-regrounding`) |
| Assumption | GraphQL の MERGED メタデータ安定性 | クロスレビュー A/B の live 実測2件で確認済み(要件 Assumptions) |
| Dependency | なし(単一 Bolt・外部サービス変更なし) | — |
| Issue | 既知の順序依存フレーク #2403(t480→t458)は本 intent の対象外面 | focused 実行では対象テスト集合が非交差 — 干渉しない |

## 前 intent 成果の退行リスク

なし — 本 intent は前 intent(260807-failclosed-recovery-path)の成果物(reconcile/advisory/declare 機構)に触れない(ファイル交差 0 を components.md の変更面で確認)。
