# Business Rules — u2-state-reconcile-hardening

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

BR は requirements の U2 担当 FR(unit-of-work の割付: FR-3f, FR-7 全補, FR-6b 完全)から導出。実装面は components(reducer/codec/executor)と component-methods(transition 3種・per-Project 上限)。障害分類は services の外部依存表を正とする。story-map ジャーニー2の成立条件。

## ルール一覧

| ID | ルール | 導出元 |
|----|--------|--------|
| BR-U2-1 | Status 同期は「所属し権限のある全 Project」へ適用し、item 追加は「設定済み対象 Project」に限る(非対称は仕様) | FR-3f |
| BR-U2-2 | 各 Project の同期は独立: 1 Project の失敗(分類を問わず)は他 Project の処理・記録を妨げない | FR-7c(受入条件6) |
| BR-U2-3 | retryable 失敗は `pending`、解決不能は `safety-blocked` として per-Project に台帳記録する(reducer transition 経由のみ — 台帳への直接書込禁止) | FR-7a(pending 面)、FR-6b(safety-blocked 面)、components の reducer 割付 |
| BR-U2-4 | reconcile は冪等: 成功済み Project へ重複追加・重複 mutation を発行しない。再実行で台帳の synced entry は不変 | FR-7b(NFR-1) |
| BR-U2-5 | pending / safety-blocked が1件でも残る間、操作は completed にならない — このとき操作 receipt は `pending`(IN_PROGRESS 分類)に留め、`safety-blocked` は Project 台帳・警告・診断のみで表現する(operation receipt へ書くと既存 terminal-block 分類で completion が恒久停止するため — U3 BR-U3-9 の層分離と同一規約。close 阻止判定の執行は U3) | FR-7a/FR-8b(U3 と分担 — 受入条件10)+amadeus-mirror-policy.ts:61-65(実装直読) |
| BR-U2-6 | 台帳の書込は audit-batch-before-state-atomicity の既存順序(audit 確定 → state write)に載せる | components の store 行 |
| BR-U2-7 | per-Project 呼び出し回数は照会1+mutation≤2 を上限とし、テストで assert する | NFR-3(component-methods の設計値) |
| BR-U2-8 | 失敗の診断・警告に生の GraphQL 応答を転記しない(redactSummary 流儀) | NFR-4 |

## テスト規約(U2 分)

- failure injection は FakeGateway の差し替え(既習様式)で行い、実 FS を使う reconcile 検証は integration 層(fs-tests-integration-first)。
- reducer transition は unit 直叩き(純関数)。codec 3面の round-trip(write⇔read 対称)を新キーで固定。
- 二重実行の冪等テスト(同一 boundary 2回 → mutation 総数不変)を必須ケースに含める。
- 秘匿(BR-U2-8): GraphQL errors に固有トークン文字列を仕込んだ失敗を注入し、警告・診断・台帳のいずれにもそのトークンが現れないこと(0 hit)を assert する。
