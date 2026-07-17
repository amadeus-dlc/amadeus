# External Dependency Map — answer-preemption-guard

上流入力(consumes 全数): `../units-generation/unit-of-work.md`(単一 Unit)、`../units-generation/unit-of-work-dependency.md`(yaml edge)、`../units-generation/unit-of-work-story-map.md`、`../application-design/decisions.md`(ADR-1〜5)、`../requirements-analysis/requirements.md`(FR-1〜7)、`../application-design/components.md`(C-1〜C-5 目録)、`../practices-discovery/team-practices.md`(変更 0 件判定)。

## 外部依存

| 依存 | 種別 | 状態 |
|------|------|------|
| checkQuestionsEvidence(amadeus-lib.ts:1173)| コード(マージ済み)| 実測確認済み — 無改修再利用 |
| sensor dispatcher / hook / graph compile | コード(無改修)| A1=YES 実測済み |
| per-PR ユーザーマージ承認 | 人間ゲート | 運用中(21:31 周知)|
| Issue #922 クロスレビュー | 完了済み | 起票時成立(2名 CONFIRMED)|

外部サービス依存なし(レジストリ照会等の実測対象なし — feasibility:c1 非適用)。

## 依存の監視

人間ゲート(per-PR 承認)は承認待ち台帳の leader 運用に従い、承認待ちをブロッカー扱いしない(merge-approval-latency)。
