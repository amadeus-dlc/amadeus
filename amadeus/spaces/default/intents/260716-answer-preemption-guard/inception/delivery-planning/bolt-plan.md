# Bolt Plan — answer-preemption-guard(Issue #922)

上流入力(consumes 全数): `../units-generation/unit-of-work.md`(単一 Unit)、`../units-generation/unit-of-work-dependency.md`(yaml edge)、`../units-generation/unit-of-work-story-map.md`、`../application-design/decisions.md`(ADR-1〜5)、`../requirements-analysis/requirements.md`(FR-1〜7)、`../application-design/components.md`(C-1〜C-5 目録)、`../practices-discovery/team-practices.md`(変更 0 件判定)。

## Bolt 構成

**単一 Bolt**(Bolt 1 = Unit answer-evidence-sensor 全体)。

| Bolt | Unit | 内容 | walking-skeleton |
|------|------|------|------------------|
| 1 | answer-evidence-sensor | C-1 script+C-2 manifest+C-3 cutoff canonical+C-4 32 stage 宣言+C-5 テスト+dist/self-install 再生成 | scope=amadeus の既定に従う(スコープマッピングは engine の skeleton-stance classify で確定 — 単一 Bolt のため実質影響なし) |

## 完了定義(Bolt 1)

FR-1〜5 全 AC 充足+AC-5c 検証列 exit 0+落ちる実証両側(AC-4a fixture 赤 / AC-4b corpus sweep 白、測定 ref 明記)+PR 発行(レビュアー指名)+per-PR ユーザー承認マージ。
