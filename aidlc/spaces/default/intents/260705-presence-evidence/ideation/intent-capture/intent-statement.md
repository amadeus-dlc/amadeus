# Intent Statement — Presence Evidence（260705-presence-evidence）

対象 Issue: [#506 docs-only 宣言の evidence を human-presence（HUMAN_TURN）と相関検証する](https://github.com/amadeus-dlc/amadeus/issues/506)

## Problem Statement

PR #505 で導入された docs-only 宣言例外（`declare-docs-only`）の evidence 検証（`verifyDocsOnlyEvidence`）は、参照された `DECISION_RECORDED` / `GATE_APPROVED` の実在照合までを行うが、その evidence が人間由来であることの機械的証明は対象外である。Bugbot の指摘どおり、`amadeus-log decision` は presence 検査なしで `DECISION_RECORDED` を追記できるため、自動化された呼び出し元が証拠を自作してから宣言でき、#366 型の workspace_requires ガードを弱め得る。

本 Intent は、presence 相関の要否を判断し、採用時は eval 先行（TDD）で実装、不採用時は設計境界を文書化する。**どちらの結論でも受け入れ条件を満たす**（Issue の受け入れ条件どおり）。

## Target Customer

- Maintainer（ゲート審査官）: ガードの信頼性と監査可能性の維持。
- エンジン（amadeus-state.ts）の後続開発者: evidence 検証の設計境界が明文で追える状態。

## Success Metrics

1. presence 相関の要否が、実施候補 3 案（相関追加 / GATE_APPROVED 限定 / 文書化のみ）の比較と論点 3 件（Cursor presence hook 不発火との整合、候補 2 と承認転記運用の衝突、presence ledger の再利用可否）の検討を経て判断されている。
2. 採用時: 先に失敗する eval 付きで実装されている。不採用時: 設計境界が文書（audit-format.md または docs）に明記されている。
3. 採否判断は契約級（#497 確定判断 8 の presence 意味論）のため、人間の個別確認を経ている（auto の例外）。

## Initiative Trigger

PR #505 の Cursor Bugbot レビュー指摘（evidence の自作可能性）。

## Initial Scope Signal

scope は **feature**（Intake 判定で候補 3 = 文書化のみ採用が確定した場合は docs 系 refactor へ理由付き変更可、というディスパッチ指示。ただし採否確定は requirements/design gate なので、birth 時点では feature を維持する）。

## 一次調査の要点（実装読解済み）

- `verifyDocsOnlyEvidence`（amadeus-state.ts:558）: evidence の形式検査 + audit shard への実在照合。presence には触れない。
- presence ledger の実体は `humanActedSinceGate`（amadeus-lib.ts:1470）: HUMAN_TURN と gate 解決イベント（GATE_APPROVED / GATE_REJECTED / QUESTION_ANSWERED）を Timestamp 順に並べ「最後の解決より後に HUMAN_TURN があるか」を判定。ledger 空なら fail-open。`humanActedSinceLastAnswer` は同一述語の alias であり、候補 1 の相関検査は同じ shard 読取（readAllAuditShards + auditBlockField）で構築可能（論点 c = 再利用可の見込み）。
- Cursor の presence hook 不発火（project.md Corrections）は手動 mint 運用が既知の回避。候補 1 は「decision 記録の直前に mint する」現行規律（#497 判断 8）と時系列的に整合する見込みだが、単独セッション利用者の環境差リスクは requirements で扱う（論点 a）。
- 候補 2 は、ディスパッチ承認転記（state-init 宛 DECISION_RECORDED）を evidence とする現行運用（本 Intent 自身もこの形）と正面衝突する（論点 b）。
