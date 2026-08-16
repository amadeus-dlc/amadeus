# Code Generation Plan — nsd-provenance(#3155)

方式 = D1'(退役、E-AD-8D942DE5)。traceability: 全 step → #3155(FR-NSD-1/2 の再束縛後スコープ)。depth Minimal。

- [ ] Step 1: TDD Red — 「events/ を持たない trustedSha の読み出しが型付き診断 + 非 0 終了で fail-closed」の negative test を events-only 前提で追加し Red を実測(現行は fallback が pristine 入力で pass するため Red になる)→ #3155 期待結果 1
- [ ] Step 2: `tests/no-silent-drop/bootstrap.ts` — `:448-451` の fallback 分岐を除去して events-only 化(events 不在 = 型付き診断)、`validateBootstrapHistory` / provenance 検証チェーン(parse/validateEvidenceBundle 等)を削除 → Step 1 が Green
- [ ] Step 3: `tests/no-silent-drop/ledger.ts` — `baselineAtRevision`(:226-227)と `CANONICAL_PATHS.baseline`(:301-302)を削除 → #3155 期待結果 1
- [ ] Step 4: fixtures 削除(`bootstrap-provenance.json`、`bootstrap/`)+ gate テスト再構成(`no-silent-drop-gate.test.ts` の bootstrapRepository / :839 / :1222-1244、`t427`)を events-only 前提へ。既存 fail-closed 3 種相当の防御が events 経路の検査で維持されることをテストで固定 → D1' 保全条項
- [ ] Step 5: fixture/rebind の処遇 — 実 artifact 束縛検査は「bootstrap-provenance.json 自体の退役により対象消滅」を根拠に不要化、rebind 欠落も同根で解消(根拠を code-summary へ記録)→ #3155 期待結果 2
- [ ] Step 6: 参照掃引 — bootstrap-provenance / validateBootstrapHistory / baselineAtRevision の残参照 0 件を grep 述語(exit code 併記)で確認。docs 参照(15-troubleshooting 等)があれば en/ja 同一変更
- [ ] Step 7: 台帳 resync(テスト増減 → `bun tests/gen-coverage-registry.ts`、allowlist 転位があれば再アンカー)
- [ ] Step 8: typecheck / lint / 対象テスト → commit → push → PR 作成(push-first。フルスイートはリモート CI 正)
