# Security Design — plugin-settings-core

上流入力: `functional-design/business-logic-model.md`(ワークフロー 1〜3 の検証点)。nfr-requirements 群は本スコープ SKIP のため不在(expected)— セキュリティ要件は requirements.md NFR-2 を正本とする。

## 脅威と対策

| 脅威 | 対策 | 実装点 |
|---|---|---|
| 機密情報(トークン等)が settings 経由でコミット対象の config に置かれる | 機密キー名パターン(token/password/secret/credential/apikey/api-key)の字句拒否 — 宣言・override 両面 | business-rules R2(宣言 parse / config parse) |
| 綴り誤り宣言による設定の無音消失(可用性・完全性) | settings 近傍キーの実在検査で loud 化 | business-rules R9 |
| 不正 override による予期しないセンサー挙動 | 宣言スキーマとの型・閉語彙突合、失敗時はセンサー中止 + loud 記録 | business-rules R6/R7 |
| プラグインが core の検証を迂回して config を直読み | ADR-6(core import 禁止 — import-closure-guard fail-closed)+ 解決済み値のみ argv で受領 | C4 設計 |
| 環境変数由来の機密の永続化 | env 宣言スキーマは本 intent では実装しない(ADR-3 先送り)。値の永続化経路を作らない | business-rules R12 |

## 多層防御の配置

1. 字句層(キー名パターン)→ 2. スキーマ層(型・閉語彙)→ 3. 境界層(process boundary — 解決済み値のみ通過)。redaction は既存の write-time / export-time 両境界(cid:practices-discovery:export-boundary-redaction)に相乗りし、settings 値はログへ出す場合も既存 redaction 経路を通す。

## 非該当項目

- 暗号化・認証・認可: 本 Unit は非機密のローカル設定値のみを扱い、ネットワーク境界を持たない(1 行理由 — Step 2 規定)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T09:01:31Z
- **Iteration:** 1
- **Scope decision:** none

security-design/logical-componentsはbusiness-logic-modelのワークフロー1〜3・kind=library契約と整合し、不在NFR入力の捏造や検証劇場もなくBLOCKERなし。

### Findings

- FOLLOW-UP | security-design.md が引く R2/R6/R7/R9/R12 は business-rules.md(consumes 外)の識別子で、その旨の file:line 明記がなく実装者が対応関係を推測する必要がある。
- FOLLOW-UP | logical-components.md の上流入力に domain-entities.md(consumes 外)が暗黙依存として挙がっている。既決事項参照として許容範囲だが file:line 裏付けがない。
