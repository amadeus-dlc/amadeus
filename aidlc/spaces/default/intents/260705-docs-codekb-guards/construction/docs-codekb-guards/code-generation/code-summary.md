# Code Summary：260705-docs-codekb-guards

unit: docs-codekb-guards（Bolt 3 本直列、すべて TDD で RED → GREEN を確認）

## B001（#498）: codekbRepoName の主リポジトリ名解決

- 変更: `.agents/amadeus/tools/amadeus-lib.ts` — `gitMainRepoName()` を追加し、`codekbRepoName` の basename フォールバックの前段に `git rev-parse --git-common-dir` 由来の主リポジトリ名解決を入れた。非 git ディレクトリでは従来の basename フォールバックを維持（FR-1.3）。
- RED 証跡: 隔離 workspace の linked worktree から repo キーが `wt-engineerX` に漏れて 2 検査 FAIL → 修正後 GREEN。
- 実機確認: 本 worktree（engineer3）での `codekb-path` が `engineer3` → `amadeus` に変わることを確認した。

## B002（#499）: workspace_requires ガードの docs-only 宣言例外

- 変更: `.agents/amadeus/tools/amadeus-lib.ts`（registry entry の `docsOnly` フィールド、`setIntentDocsOnly` / `docsOnlyDeclaration`）、`.agents/amadeus/tools/amadeus-state.ts`（`declare-docs-only --evidence` subcommand、`verifyStageArtifacts` の免除分岐 + `GUARD_EXEMPTED` emit）、`.agents/amadeus/tools/amadeus-audit.ts`（イベント型登録）、`.agents/amadeus/knowledge/amadeus-shared/audit-format.md`（Stage Lifecycle へ `GUARD_EXEMPTED` の契約を追記、69 → 70 イベント）。
- 宣言の設計（requirements O-1 の確定）: marker は registry（`intents.json`）の Intent entry フィールド（FR-2.2）。書き込みは tool-owned の `declare-docs-only` だけで、非空 evidence（承認証拠への参照）を必須にする（FR-2.3）。免除の発動は `GUARD_EXEMPTED`（Stage / Evidence）として audit に記録する（FR-2.4）。宣言なしの拒否経路は従来どおり（FR-2.5、#366 型検出の保全）。
- RED 証跡: 実装を stash した状態で eval の B002 検査 5 件が FAIL（`declare-docs-only` 未知 subcommand、宣言後も完了拒否、GUARD_EXEMPTED 不在）→ 復元後 GREEN（遡及 RED 検証。実装が eval より先行したセッション断があったため）。

## B003（#501）: validator の codekb 採用方式判定

- 変更: `skills/amadeus-validator/validator/lifecycle-v2.ts`（`checkCodekbAdoptionStub` — reverse-engineering の record 成果物が codekb への相対 `.md` リンクを含む場合、参照先正本の存在を検査。dangling は fail = FR-3.3。リンクなしは非 stub として従来どおり）、`skills/amadeus-validator/validator/AmadeusValidator.ts`（新 condition のカテゴリ分類）、`skills/amadeus-validator/SKILL.md`（stub 正式契約 = 正本相対リンク + 採用根拠 の文書化 = FR-3.2）。`dev-scripts/promote-skill.ts amadeus-validator --replace` で昇格済み。
- RED 証跡: 実装前は参照先正本（codekb/amadeus/architecture.md）を消しても validator が exit 0 → 実装後は fail 行 + 非ゼロ終了。
- 試験材料の変更: plan Step 8 の「本 Intent record の stub 9 件」ではなく、merge 済みの実 record `260705-steering-learnings`（PR #503）の stub 9 件 + 実 codekb/amadeus/ を隔離 workspace へコピーして使った。ピア協議で engineer2 が提供した実データであり、実 CLI の実出力検査（Corrections c5）に合う。

## reviewer 指摘の反映（iteration 1 → 2）

reviewer（amadeus-architecture-reviewer-agent）の iteration 1 は NOT-READY（Finding 4 件）。次のとおり反映した。

- Finding 1（重大）: `declare-docs-only` の evidence を検証するようにした。形式（`<DECISION_RECORDED|GATE_APPROVED> <stage> [detail...]`）を検査し、対象 Intent の audit shard に該当イベント（Event + Stage 一致）が実在することを照合してから registry へ書く。自由文字列によるガード回避（自己申告）は拒否される。eval に 3 検査を追加（形式不正 / audit 不在 / registry 未汚染）。
- Finding 2（中）: registry に一致行がない `declare-docs-only` は `{declared: true}` の偽陽性成功ではなく非ゼロ終了するようにした（`setIntentDocsOnly` が matched を返し、呼び出し元が拒否）。eval に 1 検査を追加。
- Finding 3（軽微）: stub 参照先の解決結果が共有 codekb store（`aidlc/spaces/<space>/codekb/`）配下であることを要求するようにし、SKILL.md の契約と実装を一致させた。`codekb/` を含むだけの無関係 path は fail する。
- Finding 4（軽微）: stage diary（`construction/code-generation/memory.md`）の位置はエンジンが emit した directive の memory_path そのもの（前例 260705-agmsg-trial-docs も同一配置）のため変更しない。

## eval / 検証結果

- `npm run test:it:docs-codekb-guards`: 24 検査すべて GREEN（B001 = 4、B002 = 16、B003 = 4）。
- `npm run typecheck`: エラーなし。
- `npm run test:it:engine-e2e`: 20 検査 ok（退行なし）。
- `npm run test:it:amadeus-validator` / `test:it:amadeus-validator-domain` / `test:it:promote-skill`: ok。
- `npm run parity:check`: ok（38 skills、197 engine files）。

## parity 宣言

- `dev-scripts/data/parity-map.json`: engineFileExceptions へ `knowledge/aidlc-shared/audit-format.md` を追加。exceptions へ #498（amadeus-lib.ts）と #499（amadeus-state.ts / amadeus-lib.ts / amadeus-audit.ts / audit-format.md）の理由を追記。`tools/data/scope-grid.json` の宣言は upstream（PR #489）由来。

## 変更ファイル一覧

- `.agents/amadeus/tools/amadeus-lib.ts`（B001 + B002）
- `.agents/amadeus/tools/amadeus-state.ts`（B002）
- `.agents/amadeus/tools/amadeus-audit.ts`（B002）
- `.agents/amadeus/knowledge/amadeus-shared/audit-format.md`（B002）
- `skills/amadeus-validator/validator/lifecycle-v2.ts`（B003、昇格反映済み）
- `skills/amadeus-validator/validator/AmadeusValidator.ts`（B003、昇格反映済み）
- `skills/amadeus-validator/SKILL.md`（B003、昇格反映済み）
- `.agents/skills/amadeus-validator/**`（promote-skill による昇格先同期）
- `dev-scripts/evals/docs-codekb-guards/check.ts`（新規 eval）
- `dev-scripts/data/parity-map.json`
- `package.json`（`test:it:docs-codekb-guards` の追加と `test:it:all` への組み込み）

## 統合の記録

作業中に origin/main が 19 commits 進み（PR #489、#503 ほか）、fast-forward + autostash 復元で `intents.json` と `package.json` が競合した。team.md の統合手順（union）で解消し、upstream の `test:it:pdm-scope` と本 Intent の `test:it:docs-codekb-guards` の両方を保持した。
