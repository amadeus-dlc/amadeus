---
feature: (kebab-case の機能名)
start-date: (YYYY-MM-DD)
rfc-pr: (この RFC を導入した PR へのリンク。マージ時に記入)
tracking-issue: (実装を追跡する Issue。承認後に記入)
status: draft # draft | approved | amended | rejected | withdrawn
version: 1 # Amendment ごとに +1。再承認まで旧版が有効(#1437)
approved-by: (承認者。承認時に記入)
approved-at: (承認日時。承認時に記入)
approval-ref: (承認の一次記録 — HUMAN_TURN / PR / Issue コメント)
bound-surfaces: (この RFC が束縛する実装面のパス列挙。digest ピンは #2396 実装時に付与)
evidence: (調査・実測文書へのパス)
---

# (RFC タイトル)

> 様式は [rust-lang/rfcs](https://github.com/rust-lang/rfcs) の 0000-template.md に倣う。節の目的説明は本テンプレートの各節冒頭の引用を参照し、起草時に引用ごと削除する。メタデータ(frontmatter)は #2396 の要求(版・承認者・承認参照・digest)、ライフサイクル(draft → approved → amendment 再承認)は #1437 に従う。

## Summary(要約)

> 1 段落での説明。

## Motivation(動機)

> なぜやるのか。どのユースケースを支え、期待する結果は何か。

## Guide-level explanation(ガイドレベルの説明)

> すでに導入済みであるかのように、利用者に教えるつもりで説明する。新しい概念の導入、例、利用者から見える挙動の変化。

## Reference-level explanation(リファレンスレベルの説明)

> 技術的な詳細。他の機能との相互作用、コーナーケース、実装面。Guide-level の例をここで完全に説明できること。

## Drawbacks(欠点)

> なぜやるべきでないか。

## Rationale and alternatives(理由と代替案)

> なぜこの設計が最善か。検討した代替案と、採らなかった理由。何もしなかった場合の影響。

## Prior art(先行事例)

> 既存の類似機構・他プロジェクトの事例・過去の裁定。良かった点も悪かった点も。

## Unresolved questions(未解決の問題)

> RFC の承認までに解決すべき問題 / 実装までに解決すべき問題 / この RFC のスコープ外とする問題、を区別して列挙する。

## Future possibilities(将来の可能性)

> この設計の自然な拡張。今はやらないが道を塞がないもの。
