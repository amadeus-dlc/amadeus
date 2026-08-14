# Business Rules — rename-github-pr-convergence

上流入力: `business-logic-model.md`(決定表)、`requirements.md` FR-REN-1〜8 / NFR-3、`decisions.md` ADR-1/ADR-2、`unit-of-work.md` U1 制約、`components.md` C1/C6、`component-methods.md`(公開契約不変の確認元)、`services.md` F3。

## 規則

| # | 規則 | 検証 |
|---|---|---|
| R1 | ディレクトリ名と plugin.json name は同一変更で一致させる | compose green(:344 検証) |
| R2 | 不変識別子 4 種(slug / センサー id / スキル名 / ツールファイル名)を diff に含めない | PR diff への grep 機械確認(FR-REN-5) |
| R3 | 残存参照はパス軸・名前軸の 2 述語で 0 件(除外理由を成果物に記録) | FR-REN-6 の exit code 記録 |
| R4 | scope-grid の 4 スコープ行は改名前後で不変 | scope-grid 検証テスト(落ちる実証 1 セット付き) |
| R5 | 旧名のフォールバック・エイリアス・互換分岐を作らない | レビュー検査(NFR-3、org.md Forbidden) |
| R6 | 歴史記録(intents/elections/codekb、project.md Learnings 引用)は不変 | 残存参照述語の除外指定と diff 確認 |
| R7 | `bun run build` 後の追跡ファイル不変・配送先ツリーの述語で再実測 | FR-X-1、cid:code-generation:c1-mirror-and-rebuild-before-review |
| R8 | 実装時にパス軸消費者を再実測してから書換え(26 件は observed 断面の値 — 差分があれば帰属確認) | cid:requirements-analysis:mechanism-cite-verify-at-draft(実装段の再列挙) |

## 不変量

- I1: 改名は挙動不変 — 全既存テストが(パス文字列更新以外の変更なしで)green を維持。
- I2: 下流 workspace への移行面: activation.names は doctor `source-missing` → degraded で loud、scope-bindings は R4 のテストパターンが検証手段(release notes へ記載 — ADR-2 Consequences)。
