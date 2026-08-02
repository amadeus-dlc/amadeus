# Business Logic Model — U6 docs

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U6 の責務は unit-of-work.md U6 行(docs ~200行、全実装 Unit 依存)から、章構成の対象面は requirements.md の FR 系列と components.md の実装目録から、公開 API 面は component-methods.md から、掲載しない面(Relay 改修なし・常駐なし)は services.md から導出した。

## 生成フロー

1. 全実装 Unit(U1〜U5)の着地後に着手(DAG エッジ docs→全 Unit)
2. 各節の属性表は実装正本(INSTRUMENTS 定数・registry def・resource キー集合)から grep/直読で転記し、#1868 の対応節と突合(乖離があれば #1868 改訂を経る — 実装を docs に合わせない)
3. docs 言語規約: **新章は en+ja の対訳ペアを同一 PR で新設**(domain-entities の構造節どおり)。既存文書ペアへの増分(相互リンク等)も両言語へ同時反映
4. docs 参照整合: 既存 docs/reference の関連章(12-state-machine の イベント語彙参照等)からの相互リンク

## 乖離解消の決定木(実装 ⇔ #1868 ⇔ docs)

- 実装が #1868 と一致 → docs は実装から転記(正常系)
- 実装が #1868 と乖離(実装バグ)→ **実装を直す**(docs は #1868 準拠のまま)
- 乖離が意図的・妥当(実装時に判明した設計改善)→ **#1868 を改訂**(改訂承認後に docs へ転記)。docs 側で独自吸収は常に禁止(BR-U6-3)
- #1868 と requirements の乖離を発見 → 上流逸脱としてユーザーエスカレーション(仕様統制)

## 検証

- t132 系 doc-consuming ガードと CI paths-ignore の関係を確認(ci-paths-ignore-doc-guard-blindspot — doc 変更がガード素通りで latent 赤を作らないこと)
- 対応表と実装定数の突合テスト(可能なら機械検査、なければ手動照合を PR 本文へ記録)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T03:44:30Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major(新章の対訳ペア設計欠落 → 21-telemetry-schema .md/.ja.md ペア新設で確定)+Minor(乖離解消の決定木明示)を是正確認し READY。

### Findings

- None
