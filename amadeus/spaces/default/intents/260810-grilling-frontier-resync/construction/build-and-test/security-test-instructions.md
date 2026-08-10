# Security Test Instructions

**Intent**: 260810-grilling-frontier-resync / **Stage**: build-and-test (3.6) / **Test Strategy**: Comprehensive

上流入力(consumes 全数): `code-generation-plan.md` / `code-summary.md` / `pr-convergence-report.md`(各 Unit の実装実績と検証実測)、`unit-of-work.md`(U1/U2/U3 の完了条件)、`requirements.md`(FR/NFR の受け入れ基準 — 本書の適用判定の正本)、`bolt-plan.md`(Bolt ごとの検証列)。

## 判定: 対象変更の攻撃面は増えない(専用 scan を新設しない)

各 Unit の `security-design.md` が同定した脅威面は以下の1点に限られる。

- **U1/U3**: 配布投影の完全性(supply chain)— 正本と生成物の不整合が「規律の分裂」を作る。統制は**既存の検証集合の再利用のみ**(build 再生成 → `source-only:check` → 隔離2回ビルド → t199)であり、新規の署名・配布経路・機構はゼロ。
- **U2**: 検査モジュール(advisory センサー)。standalone runtime・入力受理面・データストア・認証境界を持たない。追加した述語は**読み取り専用の文字列照合**であり、外部入力を実行・評価しない。

認証・認可・暗号化・secrets 管理・CSRF/XSS は**構造的非適用**(対象が存在しない)。宣言済み security requirement は存在しない(本スコープは nfr-requirements を SKIP)。

## 実行する検査(既存面の再利用)

| # | 検査 | 目的 | 合否 |
|---|---|---|---|
| S-1 | `bun run lint`(Biome) | 危険パターン・未使用の混入検出 | exit 0 |
| S-2 | `bun run typecheck` | 型面の退行検出 | exit 0 |
| S-3 | `bun run source-only:check` | 生成物の独立正本化の禁止(配布完全性) | exit 0 |
| S-4 | フルスイート内の境界ガード群(t258 出荷 core の `scripts/` 非参照、no-silent-drop、mechanism ratchet 等) | 出荷面の境界契約 | 下記「帰属」に従う |

## 依存監査の扱い

対象変更の security regression と**リポジトリ全体の dependency audit は別判定**とする。本 intent は依存を追加・更新していない(`bun install --frozen-lockfile`)。既存の advisory があってもそれは範囲外であり、隠さず別作業へ送る(cid:build-and-test:c1-doctor-seam)。

## この判定を覆すべき条件

センサーが**信頼境界外の不定長入力**に対する新規 regex を持つ場合、敵対入力での線形性実測を完成条件に加える(cid:code-generation:regex-linearity-untrusted-input)。本 intent の追加述語は固定様式の短トークン照合(HTML コメントマーカーと固定様式の記録行)であり、同 cid の適用対象外。
