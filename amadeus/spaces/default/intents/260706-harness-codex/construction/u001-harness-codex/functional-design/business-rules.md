# Business Rules — u001-harness-codex

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)。

## 不変規則

1. 写像は skillNameMapping の prefix 規則のみを使う。個別対応表を発明しない（両側実在の交差で決める）。
2. 上流実体が正。取り込み内容の創作・改善をしない（rename 契約の置換と provenance コメント付与のみが許される変更）。
3. 独自 skill（上流に不在）と skill-forge 由来の既存 openai.yaml（amadeus-grilling / amadeus-domain-modeling）には触れない。
4. .agents/skills/ へ直接書かない。反映は promote-skill.ts 経由のみ。
5. 既存 tooling の機構を変更しない（NFR-3。allowlist.json の scanRoots 1 行のみ FR-6.5 の明示例外）。
6. 検証記録なしで完了を主張しない（FR-6 の各確認は provenance.md / build-and-test 成果物へ記録）。

## 分量・形式規則

- provenance コメントは 4 行固定（questions Q2 = A）。
- harness/codex の 2 文書は日本語（requirements Q2 = A）。README には Phase 2 での言語再判定条件を明記。
