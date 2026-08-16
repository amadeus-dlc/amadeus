# Code Summary — sensor-docs-sync(#3097)

branch `open-bug-batch-7/sensor-docs-sync`(実装 head `a013a5bd2`、record 同梱後の PR head は pr-convergence-report.md の記載を正とする。push 済み・conductor 統合済み)。方式 = D3 + クロスレビュー refinement(値照合述語、06 側陳腐値)。実測値は builder 報告からの転記。

## 変更ファイル(5 ファイル、2 コミット)

- `tests/integration/t3028-sensors-docs-sync.integration.test.ts` — 名前のみ照合から name→glob ペア照合へ拡張(+157/−18)。07 en/ja の表を対象化(期待集合は `derivedCorpus()` の matches 宣言サブセット 13 件 — 第 2 コーパスを作らない)。06 は glob 列を持たないため containment 述語(引用 glob が実 manifest 宣言値であること)— prose parse 設計は `cid:code-generation:c-decl-input` に従い回避。glob セル欠落・parse 不能は fail-closed
- `docs/reference/07-sensor-system.md` / `.ja.md` — 表へ 4 行追加(nfr-budget / pr-convergence-report-format / question-budget / scope-sizing)+ 陳腐 2 行是正 + スキーマ例 2 行是正(追補、E-AD-528D74AF — requirements の Out of scope「表以外の節」を上書きする個別裁定。要件が方式裁定を設計・実装段へ委譲する枠内)
- `docs/harness-engineering/06-sensors.md` / `.ja.md` — 散文の陳腐 glob 各 1 行是正(en:80 / ja:45、レビュー実測を builder が再実測で確認)

## TDD・落ちる実証

- Red(拡張後・修正前): t3028 → exit 1、5 pass / 6 fail(新規 6 述語ちょうど)
- Green(修正後): exit 0、11 pass / 0 fail
- 注入 3 種(値改変 / 行削除 / 06 散文改変)→ 各 Red 実測 → revert(baseline diff SHA-256 一致 + INJECTED 0 件 + 競合マーカー exit 1 で残渣ゼロ機械確認)。**注入 A で名前集合が緑のまま値照合のみ赤 — #3097 の患部クラスを新述語だけが検出することを実証**

## 検証(worktree、exit code は builder 実測)

typecheck 0 / lint 0 / t3028 exit 0(11 pass)/ coverage-registry --check 0(regen 不要)。conductor 統合断面でも t3028 11 pass を再実測。フルスイートはリモート CI 正。

## 申し送り

- 07 のスキーマ例 fenced YAML ブロックは新設述語の射程外(表でも 06 散文でもない)— 同種再発は現状手動検出。「スキーマ例の frontmatter が実 manifest と一致する」別述語の追加は将来判断(テスト冒頭コメントに境界の根拠記録済み)
- git-drift の PostToolUse 非発火仮説(`amadeus-sensor-fire.ts:225`)は本 intent スコープ外の別トリアージ候補(§13 で扱う)
