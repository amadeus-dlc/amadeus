# Security Design — U1 fmc-retirement

上流入力: `../functional-design/business-rules.md`(BR-2 非接触・BR-7 表現制約)、`inception/requirements-analysis/requirements.md`(NFR-2〜4)、`inception/application-design/decisions.md`(ADR-1 Security/Compliance 節)。

## 脅威・攻撃面の変化(削除 intent の security 評価)

| 面 | 変化 | 根拠 |
|---|---|---|
| 攻撃面 | **縮小** — CLI 実行系(TLC spawn・docker trace・fs toolchain 約 7,600 行)と JDK 依存が消滅 | components.md 削除表・FR-CI-3 |
| 新規外部境界 | **なし** — ネットワーク・認証・秘密情報を扱う要素の新設ゼロ。合成 fixture はダミー宣言 + no-op CLI のみ | domain-entities.md 不変条件 |
| 秘密情報 | 取り扱いなし(削除対象にも credential なし — plugin.json/specs は公開データ) | RE census |
| 監査完全性 | 不変 — 監査シャード・record は削除対象外(FR-DEL-1 の検索対象から `amadeus/` 除外) | FR-DEL-1 |

## fail-closed の保全(NFR-2 の設計適用)

- ci.yml の blocking job 除去(FR-CI-1)は「ゲートの緩和」ではなく「検査対象の消滅に伴う整合」— **他の required check の blocking 性は不変**であることを ci-success の needs 差分実読で確認する(NFR-4)
- t341(plugin-conformance、blocking)は合成 fixture で**検査強度を維持**(assertion 削除 0 — BR-6)。コア advisory 機構の fail-closed 挙動は A2 温存 4 件が引き続き検証する
- 削除により検証が消える面(形式モデル 4 本の CI 検査)は**意図された仕様変更**(ユーザー裁定)であり、代替の偽装検査を作らない(検証劇場禁止 — 消えた検証を消えたと記録するのが正)

## 実装時の security 検査事項

1. 合成 fixture の tool(no-op CLI)が入力を読まない・書かないことを実装で保証(spawn 検査の標本になるだけ)
2. 削除 diff に `amadeus/` 配下(監査・record)の巻き込みがないことを `git diff --stat -- amadeus/` 空で確認(record checkpoint は別コミット)
3. 依存削減の確認: `mise.toml` から JDK が消えた後、CI に Java セットアップ残渣がないこと(FR-CI-1 の job 削除に包含)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-21T04:52:09Z
- **Iteration:** 1
- **Scope decision:** none

READY: 削除 intent に適合した security 設計。fail-closed 保全・検証劇場不在・実装時検査の機械述語性を確認

### Findings

- FOLLOW-UP | 非 ID 参照(components 削除表・domain-entities 不変条件・RE census)への行番号アンカー付与 — 次回改訂時
- FOLLOW-UP | 『A2 温存 4 件』のラベル定義元(RE census のテスト分類)への参照明示 — code-generation-plan で定義を再掲して閉包
- NIT | nfr-design の upstream-coverage センサーが static frontmatter 全体を検査する実装か否かの事後確認
