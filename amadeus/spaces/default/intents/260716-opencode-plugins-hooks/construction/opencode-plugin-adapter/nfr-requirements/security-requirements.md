# Security Requirements — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../functional-design/business-logic-model.md`(決定木)、`../functional-design/business-rules.md`(R-2/R-3/R-5)、`../../../inception/requirements-analysis/requirements.md`(AC-2d/AC-3c)、codekb `technology-stack.md`(Bun/TS)。2026-07-17。

## セキュリティ要件(構成上の攻撃面に比例 — build-and-test:c3 準拠)

| # | 要件 | 由来 | 検証面 |
|---|---|---|---|
| S-1 | 境界入力検証: payload 欠落フィールドは fail-closed(error)、推測補完禁止 | R-3(business-rules) | AC-3a テスト(エッジ系) |
| S-2 | コマンド注入面の不存在を維持: spawn 対象は frozen map の固定 hook ファイル名のみ — payload 由来文字列を実行コマンド・ファイルパスへ流さない(cursor CoreCall.hookFile 同型: 写像側の静的リテラルのみ) | business-logic-model ワークフロー2 | コードレビュー+C4 テスト(hookFile が固定集合であること) |
| S-3 | phantom HUMAN_TURN の封鎖: machine 注入マーカー判別不能なら mint 配線見送り(presence 汚染 = 監査整合性の防御) | R-5 / AC-3c / ADR-5 | 工程0 表+レビュー |
| S-4 | credentials・API キー・シークレットの取り扱いなし(構成上不存在)— ハードコード禁止(construction phase 規範)は対象ゼロで自明充足 | services.md(境界=ローカル spawn のみ) | grep 検査 |
| S-5 | 認証・認可: 対象実体なし(N/A)— plugin はローカル単一ユーザーの開発ツール内で動作し、ネットワーク境界・マルチテナント面を持たない | services.md | — |

## 脅威考慮(比例選定)

- **信頼境界**: opencode(ユーザーの実行環境)→ plugin → core hooks はすべて同一ローカル信頼域 — 新規の信頼境界を導入しない。plugin が受け取る payload は opencode 由来(既にユーザー権限で動作するプロセス)で、権限昇格ベクタなし
- **監査整合性が本 unit の第一級セキュリティ資産**: 誤 mint(#708/#755 クラス)は presence 汚染 = ゲート偽装に等しい — S-3 の fail-closed が唯一の新規リスクへの対処
- 規制・コンプライアンス要件: なし(新規データ収集・保存・送信ゼロ)
