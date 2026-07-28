# Reliability Requirements — u1-project-sync-skeleton

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 冪等性(requirements NFR-1)

- item 追加は冪等: 既所属なら追加しない(business-rules BR-U1-2、FR-2a)。現在 Status が期待と一致するなら mutation を発行しない(BR-U1-6、FR-3e)。
- 検証: 同一 boundary の二重実行テストで mutation 総数不変を assert(NFR-1 受入基準)。

## 障害時挙動

- gh 不在・未認証・API 障害は当該 mirror 呼び出しを **loud fail** し、workflow 全体は恒久停止しない(requirements FR-7e — unsynchronized 警告+継続の既存 Mandated)。
- Project 同期の失敗は Issue 本文 mutation の成果を巻き戻さない(business-rules BR-U1-9 — 別 mutation・部分成功前提)。U1 では失敗時に台帳へ書かず警告のみで継続し、pending 永続化と冪等 reconcile は U2 責務(先取りしない)。
- Status フィールド/選択肢が解決できない場合は当該 Project を safety-blocked として観測し、診断(期待名+実在選択肢一覧)を出す(BR-U1-5、business-logic-model の観測面)。

## 可用性目標(非適用の明示)

- SLA/SLO・災害復旧・バックアップ目標は N/A — 常駐サービス・独自データストアを持たず(根拠: requirements FR-1b — daemon・polling・GitHub Actions を導入しないチェーン内実行のみ)、永続状態は git 管理の record/state のみで既存のバージョン管理が回復手段(cid:observability-setup:c3 の N/A 規律: timeout・単発 run 成功を service SLO へ昇格させない)。

## データ耐久性

- 台帳(projectSync)の書込は既存 state 書込経路(audit 確定 → state write の順序 — cid:functional-design:audit-batch-before-state-atomicity の既存不変)に載せる。U1 で新しい永続化機構を導入しない。
