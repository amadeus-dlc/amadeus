# Requirements Analysis — 明確化質問(260710-mint-presence-vectors / #755)

> 回答方式: election-protocol(エージェント間選挙)。既決事項は問わない:
> (1) fail-open 原則(人間を誤抑止しない)維持 (2) 落ちる実証必須(Mandated)(3) t203 系テストに D 形式の抑止を固定(leader 指示)
> (4) dist/self-install 同期 (5) RE 確定事実 — B は合成のみ・本番非該当、D が確定ベクタ、tier-3 は同根でより露出大。

## Q1. 抑止カタログの範囲と判定方式(mint-presence 分類器)

背景(RE 実測): 現行は `MACHINE_INJECTED_PROMPT_PREFIX`(`<task-notification>`)の `startsWith` 一点判定。本番ベクタは D(`Another Claude session sent a message:` 開頭)。B(`[SYSTEM NOTIFICATION - NOT USER INPUT]` 前置き)は本番 amadeus に不在(0/439)だが合成到達可能で、外来ハーネス表示形として実在。

- A. **D マーカーを追加し、判定は「先頭 N バイト以内の marker 検出」(前置き許容)に一般化**: カタログ = `<task-notification>` / `<teammate-message` / `Another Claude session sent a message:` / `[SYSTEM NOTIFICATION - NOT USER INPUT]`。B も防御的に包含(コストほぼゼロ、外来ハーネス経由の将来露出も閉じる)。人間の誤抑止リスクは「冒頭数百バイトにこれらの機械マーカーを打つ人間はいない」水準で fail-open 原則と両立(推奨)
- B. D マーカーのみ追加、startsWith 判定は維持(本番実測ベクタに限定した最小修正。B/前置き系の将来露出は再発時に対応)
- C. 注入元(agmsg/Monitor 側)のマーカー規約を一本化し、分類器は単一 marker のまま(注入側全箇所の改修が必要でスコープ大、外来注入元には効かない)
- X. Other (please specify)

[Answer]:

## Q2. stop.ts tier-3(transcriptIsConversational)の同根欠陥のスコープ

背景(RE 実測): tier-3 は除外が `"Stop hook feedback:"` のみで A も D も素通り — mint hook より露出大。修正するならカタログの単一定義共有(construction guardrail「複数箇所で消費する定数は canonical 1 定義から導出」)が自然。

- A. **本 intent に含める: 注入マーカーカタログを共有定数(単一定義)へ抽出し、mint-presence と stop.ts tier-3 の両方が消費する**(同根欠陥の同時修正 + カタログ二重定義の構造的防止。#755 本文の Expected「注入形式のカタログをテストに固定」とも整合)(推奨)
- B. tier-3 は別 Issue へ分離し、本 intent は mint-presence のみ(最小スコープだが、カタログを 2 度定義することになり、後続修正時に drift リスク)
- X. Other (please specify)

[Answer]:

## Q3. 既存の phantom HUMAN_TURN 行(過去 shard の汚染)の扱い

背景: フィールドに大量の幻影 HUMAN_TURN が既に存在(#755 実測2: 単一 shard 350 行・中央値 61 秒間隔)。監査 shard は append-only 原則。

- A. **過去 shard は改変しない(append-only 維持)。修正は今後の鋳造のみ止め、汚染期間の存在を #755 close コメントに記録**(推奨 — 監査改変はそれ自体が信頼性毀損。過去の delegate 発行はすべて leader の実人間ターン近傍で行われており実害の遡及検証は不要と判断)
- B. 汚染 shard に注記行を追記する(append-only の範囲内だが、shard を消費する既存パーサへの影響確認が必要でコスト増)
- X. Other (please specify)

[Answer]:
