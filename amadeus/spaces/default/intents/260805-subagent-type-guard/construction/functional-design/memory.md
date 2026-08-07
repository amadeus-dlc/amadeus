<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T22:30:00Z — U1 §12a i1 BLOCKER(AD 正本に無い personaNames の無申告追加)は「canonical シグネチャ保存の代替設計(builtin 先勝ち判定順)」で是正 — 承認済み設計への回復であり逸脱裁定は不要(P3 の回復側)。AD 規則コメントとの順序逆転は citation-semantics-check の意図的相違として BR-U1-1 に明文照合を記載。i2 READY。
- 2026-08-05T22:30:00Z — U2 の resolvePersonaPin 引き当て規則は FR-1a と同一原理(frontmatter name: 完全一致、basename 決め打ち禁止)で固定。AD 内2表現(personaPins 写像 / personaPin 単数)は component-methods(シグネチャ正本)の単数形を採用。
- 2026-08-06 — walking-skeleton × full grant: ユーザー裁定により Bolt 1 ゲートは実人間承認で運用(canonical は「full だけが grant により自動承認できる」#2067+#2253 — intent 固有の運用選択であり canonical 変更ではない)。bolt-plan.md:15 の「グラント認可不可」は事実誤認として訂正済み。Issue 起票案は #2253 既決のため pre-filing-dup-and-branch-check により見送り(ユーザーの起票意向は既決確認の報告で代替)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T22:30:00Z — U2 は reviewer 予算2回消費後も是正起因の新 BLOCKER が残ったため、E-LSSADS13(列挙 omission ならぬ設計ギャップ = 機械検証不能クラス)に従い**閉包確認限定の追加イテレーション(i2b)**を実施 — 通常予算超過の開示。verdict と閉包判定は record の Review ブロックに記録。
- 2026-08-05T22:30:00Z — U2/U3 の per-unit directive は engine から re-emit されないため(全成果物先行作成済み)、U1 directive からの機械的テンプレート置換(unit 名+produces)で構成し reviewer-runtime scope へ投入(c1-degrade-batch-directive-capture の類推適用)。invocationId: U2=d152b5f6…, U3=010195b7…。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-05T22:30:00Z — U2 の pin 読取は C-1 拡張でなく独立ヘルパ(FS 走査最大2回/発火)を採用 — 変更理由の分離を読取回数より優先(services 期待値との意図的差分を BR に申告)。
- 2026-08-05T22:30:00Z — U3 の対欠落(Model/Model Source)は専用フィールド追加でなく既存フィールドからの導出値+注記行で処理 — 型の肥大より縮退許容の明文化を選択。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
