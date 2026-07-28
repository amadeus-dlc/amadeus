# Reliability Design — u1-project-sync-skeleton

上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

reliability-requirements の冪等性・loud-fail・safety-blocked 観測を、business-logic-model の分岐配置として設計する。circuit breaker・指数バックオフ・ヘルスチェック・フェイルオーバーは非適用(cid:nfr-design:c1 — boundary 駆動の再実行と fail-closed 分岐で代替)。

## 冪等性の機構配置

- **追加の冪等**: 所属照会(business-logic-model 手順2)の結果で既所属を判定してから追加(手順3)— 「確認してから書く」順序を構造化し、同一 boundary 再実行での重複追加を発行しない(reliability-requirements の NFR-1 面)。
- **適用の冪等**: 現在 Status と期待の比較(手順7)を mutation より前に置く — 既一致なら発行ゼロ。二重実行テストで mutation 総数不変を assert(reliability-requirements の検証)。検査面は performance-design と同じ FakeGateway history(performance-requirements)。

## 障害時の分岐設計(fail-closed+継続)

- **照会失敗**(手順2): 当該 boundary の Project 同期を中断し unsynchronized 警告のみ — Issue 面の成果を保持し、台帳へ書かない(reliability-requirements — pending 永続化は U2 責務の先取り禁止)。workflow は継続(loud fail)。
- **解決不能**(手順4/6: フィールド不在・選択肢不一致): 当該 Project を skip し、期待名+実在一覧の診断を出す(safety-blocked の観測 — 診断内容は security-requirements の秘匿契約(設計は security-design)に従う)。他処理へ波及させない。
- **リトライ方針**: 手順内リトライ・バックオフを持たない — 再実行は次の boundary / manual sync 駆動(reliability-requirements、tech-stack-decisions の boundary 駆動決定)。rate-limit も同様に retryable 分類 → 警告+継続(scalability-requirements)。

## 部分成功の設計

- Issue 本文 mutation と Project mutation は別 mutation — Project 側の失敗は Issue 側の成果を巻き戻さない(reliability-requirements)。ロールバック機構を設計しない(単方向・追記的な操作列のため補償トランザクション不要)。

## 落ちる実証の設計

- 「存在しない選択肢名」を設定へ注入し safety-blocked 化+診断内容の赤を確認(business-logic-model の落ちる実証欄 — 注入面はテストが読む policy 入力)。正当データで赤くならない両側実測を完成条件とする。

## 非目標

- ヘルスチェック・フェイルオーバー・レプリケーション・バックアップ: N/A(reliability-requirements の N/A 規律 — 常駐面・独自データストアなし、回復手段は git)。
