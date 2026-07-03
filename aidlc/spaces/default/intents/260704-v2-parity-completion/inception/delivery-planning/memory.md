# Memory: delivery-planning

## Interpretations

- 「中間 PR なし」の人間指示を、Bolt 境界の記録は audit イベントで行い、Bolt PR と phase PR を最終 PR 1 本へ統合する運用と解釈した。walking skeleton gate（人間承認）は最終 PR レビューへ統合する。
- U003（38 skill）は 1 Unit のまま、B001（薄切り 1 skill）と B002（残り）の 2 Bolt に分けて吸収した。

## Deviations

- 質問 3 点のうち 2 点（walking skeleton、順序）は GD010 と GD011 で確定済みのため再質問せず、束ね方だけを自動確定した（GD013）。
- ソロ開発のため team-allocation.md は作成していない（skill 契約の「チームがある場合のみ」に従う）。

## Tradeoffs

- 最終 PR 1 本への統合は、レビュー粒度と切り戻し容易性を犠牲にして、夜間自律進行の速度と人間の負荷軽減を優先する。粒度例外の理由は最終 PR 説明に記録する（C002 の運用）。
- B004 に文書と実証を同居させたのは、両方とも「全体が動いた後」という同じ前提を持つためである。肥大化したら B004 内で順に処理する。

## Open questions

- real provider の実行環境とコスト（B004 開始時に確認）。
- dogfooding の具体範囲（B004 で、少なくとも 3.6 Build and Test 相当以降をエンジン駆動で実行できるかは、B001 の結線検証結果に依存する）。
