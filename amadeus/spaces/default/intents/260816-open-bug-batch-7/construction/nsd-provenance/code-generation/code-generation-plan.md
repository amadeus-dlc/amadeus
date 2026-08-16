# Code Generation Plan — nsd-provenance(#3155)

方式 = D1'(退役、E-AD-8D942DE5)。traceability: 全 step → #3155(FR-NSD-1/2 の再束縛後スコープ)。depth Minimal。

- [x] Step 1: TDD Red — 「events/ を持たない trustedSha の読み出しが型付き診断 + 非 0 終了で fail-closed」の negative test を events-only 前提で追加し Red を実測(現行は fallback が pristine 入力で pass するため Red になる)→ #3155 期待結果 1
- [x] Step 2: `tests/no-silent-drop/bootstrap.ts` — `:448-451` の fallback 分岐を除去して events-only 化(events 不在 = 型付き診断)、`validateBootstrapHistory` / provenance 検証チェーン(parse/validateEvidenceBundle 等)を削除 → Step 1 が Green
- [x] Step 3: `tests/no-silent-drop/ledger.ts` — `baselineAtRevision`(:226-227)と `CANONICAL_PATHS.baseline`(:301-302)を削除 → #3155 期待結果 1
- [x] Step 4: fixtures 削除(`bootstrap-provenance.json`、`bootstrap/`)+ gate テスト再構成(`no-silent-drop-gate.test.ts` の bootstrapRepository / :839 / :1222-1244、`t427`)を events-only 前提へ。既存 fail-closed 3 種相当の防御が events 経路の検査で維持されることをテストで固定 → D1' 保全条項
- [x] Step 5: fixture/rebind の処遇 — 実 artifact 束縛検査は「bootstrap-provenance.json 自体の退役により対象消滅」を根拠に不要化、rebind 欠落も同根で解消(根拠を code-summary へ記録)→ #3155 期待結果 2
- [x] Step 6: 参照掃引 — bootstrap-provenance / validateBootstrapHistory / baselineAtRevision の残参照 0 件を grep 述語(exit code 併記)で確認。docs 参照(15-troubleshooting 等)があれば en/ja 同一変更
- [x] Step 7: 台帳 resync(テスト増減 → `bun tests/gen-coverage-registry.ts`、allowlist 転位があれば再アンカー)
- [x] Step 8: typecheck / lint / 対象テスト → commit → push → PR 作成(push-first。フルスイートはリモート CI 正)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-16T15:48:08Z
- **Iteration:** 1
- **Scope decision:** none

nsd-provenance(#3155)のcode-generation成果物3点はstage契約のMinimal様式・traceabilityを満たす。plan 8ステップは code-summary(TDD Red→Green実測、19ファイル変更、逸脱4件の裁定id付き申告 E-AD-6C190CAF、参照掃引・台帳resyncまで)と実質的に対応しており、無申告の逸脱は検出しなかった。pr-convergence-reportも kind:created / PR#3157 / unit:nsd-provenance / bolt:1 / local・remote・pr headの三者一致で内部整合している。BLOCKERは0件。plan側のチェックボックス未消化、code-summaryのbranch head記載の陳腐化、D1'(退役)の詳細裁定が本レビュー範囲外のdecisions.mdにしかない点をFOLLOW-UPとして記録する。

### Findings

- FOLLOW-UP | code-generation-plan.md の全8ステップが `[ ]` 未チェックのまま残っており、code-summary.md が記述する完了状態(TDD Red→Green実測、PR #3157作成済み)と整合しない。stage契約 Step 4 は delegation prompt に『各ステップ逐次実行後にチェックボックスを完了マークする』指示を含めることを求めており、完了記録としてplanを機能させるには本来チェック消化が必要。次回生成完了時に `[x]` へ更新することを推奨する。
- FOLLOW-UP | code-summary.md 冒頭の branch head 記載(`fbf7fd315`)が、同unitの pr-convergence-report.md が記す PR head(`3fd75b517aff33feed6761722c3fc33d940b794a`)、および会話上のconductor attested context(head `3fd75b517`)と一致しない。code-summaryの『逸脱』節にある『adoption evidence rebind(別コミット)』が後続でheadを更新した可能性が高く、summary側のhead citation自体が未更新のまま残っている。誤ったhashの残置は追跡調査での混乱を招くため、実際に着地したheadへ訂正することを推奨する。
- FOLLOW-UP | D1'(退役、E-AD-8D942DE5)の実施範囲(bootstrap fallback + provenance検証チェーン全体の削除、fixture約17,416行分の削除を含む)は、unit-of-work.md 再束縛後の責務記述(『baselineAtRevision死経路の除去』『陳腐化provenance値の扱いの確定』『実artifact非束縛fixture/rebind欠落の処遇確定』)と方向性としては整合するが、この3項目の記述だけでは『退役』という具体的な選択結果までは一意に導けない。決定内容そのものは本レビュー範囲外のdecisions.mdにのみ存在するため独立検証できなかった。unit-of-work.mdの再束縛記録に、再裁定の結果(D1'の要旨)を追記して自己完結させることを推奨する。
- NIT | code-summary.mdの検証節が記す『参照掃引8述語』と、会話上のconductor attested contextが記す『参照掃引3述語』の数が一致しない(後者は前者の部分集合と推測されるが、明示的な対応関係の記述がない)。どの3つを再実測したか一言添えると追跡が容易になる。
