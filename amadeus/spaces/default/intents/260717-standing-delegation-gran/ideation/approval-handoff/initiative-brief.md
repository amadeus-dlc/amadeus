# Initiative Brief — standing-delegation-grant(Issue #1125)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## 意思決定サマリ

**GO — inception へハンドオフ**。feasibility-assessment は全 seam 実測に基づく GO(確信度高)、scope-document は Must 6 項の単一 Bolt 見立て、constraint-register は C-1〜C-10 で境界を固定済み。ユーザー方向性確認(TS 機構化)+着手の事後承認+チームモード限定の追加指示(intent-statement 成功基準7)まで反映済み。

## リスクと緩和(代替緩和策併記 — approval-handoff:c1)

| リスク(raid-log より) | 一次緩和 | 代替緩和 |
|---|---|---|
| R-1 scope 逸脱で P4 が弱まる | 既定除外の構造実装+落ちる実証 | ノルム側 standing-approval-scope-limit の二重防衛(既設) |
| R-2 TTL 型不正の無言 fail-open | parse→比較+型不正の落ちる実証 | doctor 可視化で残 TTL を人間が目視可能に(Should) |
| R-3 撤回の伝播遅延 | TTL 上限+design で結果整合を明文化(FQ2 選挙) | 受理時 fetch 強制案を FQ2 の対抗候補として保持 |
| R-4 ソロモード漏出 | env 唯一判定の両側 fail-closed+ソロ拒否実証 | — (構造で閉じる) |
| R-5 偽 provenance | 発行行+根拠 HUMAN_TURN の実在照合(既習様式) | HUMAN_TURN mint 拒否(既設・無改修) |

## inception への引き継ぎ事項

- design 選挙2件(FQ1 保存・配送形態 / FQ2 撤回伝播)+FQ4(session 失効)+TTL 値確定(constants-from-code、対照 DEFAULT_LOCK_STALE_MS)
- E-SDG-IC C1(一時状態 fixture)のテスト設計適用(D-3)
- 白側 sweep 基準面 = #671 既存 delegate フロー(退行ゼロ)
