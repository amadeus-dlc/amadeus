# Scalability Requirements — election-transport(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 負荷前提と成長予測

- 配信対象は選挙1件の投票者集合(現登録 14 名 — stage diary の team.sh 実測記録)。W-04(配布外)により成長前提を持たず、容量計画は N/A(反証可能な根拠: requirements.md FR-7a の輸送は team/solo の2モードのみで、多チーム横断配信の要件が存在しない)
- 輸送実装の追加(将来の第3輸送)は VoterTransport port(business-logic-model.md — 単一シグネチャの判別ユニオン戻り値)への実装追加で閉じ、既存2実装へ影響しない

## 同時実行

- 配信は conductor 単一プロセスからの逐次実行(U2 と同じ単一書込主体構造 — DeliveryRecord の記帳は U2 store 経由)。並行配信の制御は不要。実行形態は既存スタック(technology-stack.md 実測の Bun 単一プロセス直接実行)のまま
