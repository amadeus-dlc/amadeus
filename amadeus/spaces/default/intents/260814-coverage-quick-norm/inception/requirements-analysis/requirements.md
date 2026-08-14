# Requirements — 260814-coverage-quick-norm

## Upstream inputs

- 消費して本 intent の事実を引く面: `ideation/intent-capture/intent-statement.md`、`codekb/amadeus/architecture.md` の現在節「coverage-patch-quick は advisory 近似であり CI gate の代替ではない」、`codekb/amadeus/re-scans/260814-coverage-quick-norm.md`。
- `codekb/amadeus/business-overview.md` / `code-structure.md` は本 intent の RE がレビュー済み無変更とした面で、本 intent の節を持たない。一般文脈のみの前提とし、本 intent の事実は引かない(cid:requirements-analysis:c4-consume-header-is-not-citable-content)。
- 一次資料: Issue #2933、PR #2965、`gh api repos/amadeus-dlc/amadeus/actions/jobs/94095568607`。

## Intent analysis

着地済みの `coverage-patch-quick` を、push 前内側ループの標準にする運用ノルムを Learnings Inbox へ1件追記する。蒸留済み本文への昇格はしない。CI の blocking gate は正本のまま残す。

## Functional requirements

### FR-1: 追記先は Inbox のみ
`amadeus/spaces/default/memory/project.md` の「Learnings Inbox(未蒸留)」節へ箇条を1件追加する。
受け入れ基準: 追記後も `## Learnings Inbox(未蒸留)` 見出しは1つ。蒸留済み節(Way of Working / Testing Posture / Corrections 等)の行差分は 0。

### FR-2: 様式は既存 Inbox エントリに合わせる
日本語1箇条、根拠 PR/Issue、実測コマンドと測定 ref、末尾 `<!-- cid:... -->`。
受け入れ基準: 直近 Inbox 行(例: 型注釈非対称エントリ)と同じ要素を持つ。

### FR-3: push 前の標準は quick の advisory
push 前の patch coverage 往復は `coverage-patch-quick` の advisory 判定を標準とする。
受け入れ基準: 本文が `coverage-patch-quick` と `advisory` を名指し、フル `coverage:ci` を内側ループの標準としない。

### FR-4: フル coverage:ci は最終確認1回
フル `coverage:ci` はゲート直前の最終確認1回に限る。
受け入れ基準: 本文がその制限を述べる。

### FR-5: ローカルフル実行は `-P 4`
ローカルでフル `coverage:ci` を回すときは CI と同等の `-P 4` を付ける。
受け入れ基準: 本文が `-P 4` を含み、根拠として `ci.yml:466` または同等の実在行を再照合できる。

### FR-6: フル実行中は重い並行をしない
フルスイートを合否判定に使う実行中は他の重い作業を並行しない。
受け入れ基準: 本文が `cid:code-generation:c1-coverage-single-owner` と load-sensitive 帯 `#1331/#1326` を引く。

### FR-7: quick は blocking gate の代替ではない
quick は advisory であり、CI の Patch Coverage Gate / Project Coverage Gate の代替ではない。
受け入れ基準: 本文が代替ではないことを明示する。機構根拠は `EXIT_ADVISORY=0`（`coverage-patch-quick-cli.ts:254-255`）とバナー（同 `:266-284`）。

### FR-8: 引用数値は再実測転記
11 分 03 秒と 3 秒は job 94095568607 の steps 再取得から転記する。
受け入れ基準: 本文に取得コマンド `gh api repos/amadeus-dlc/amadeus/actions/jobs/94095568607` と started_at/completed_at を併記する(cid:requirements-analysis:numbers-from-command-output-only)。

### FR-9: 根拠 PR/Issue を併記
PR #2965 と Issue #2933 を併記する。
受け入れ基準: `gh pr view 2965` が MERGED、`gh issue view 2933` が実在する状態で起草する。

### FR-10: 既存則との非矛盾
single-owner と数値転記規律を緩めない。
受け入れ基準: 追記が「quick とフル計測の並行を許す」とも「数値を推定で書いてよい」とも読める文を含まない。RE 対照表を満たす。

### FR-11: 無関係ファイルを変えない
変更は `project.md` と本 intent record / 本 intent の codekb 更新に限る。
受け入れ基準: `git diff --name-only origin/main` の追跡ファイルが、ノルム PR では `project.md` と(同梱するなら)本 intent 配下のみ。

### FR-12: 他 intent record へ書かない
受け入れ基準: `amadeus/spaces/default/intents/` 配下で本 intent 以外のパスへの差分が 0。

### FR-13: origin/main 起点の単独 PR
ノルム変更は origin/main 起点の単独ブランチで PR を作り、独立レビューを経る(cid:requirements-analysis:norm-consistency-review)。
受け入れ基準: `git merge-base HEAD origin/main` が `origin/main` と一致するか、PR base が `main` で当該コミットだけがノルム追記である。

### FR-14: マージしない
PR マージは人間専権。
受け入れ基準: 本 intent は `gh pr merge` を実行しない。pr-convergence は CI green とレビュー READY の実測で停止する。

### FR-15: TDD 適用外と関連検査
md のみの変更なので TDD 適用外。関連 docs 検査があれば通す。
受け入れ基準: 振る舞いを持つコードを追加しない。docs 系ゲートまたは対象テストがあれば exit 0 を実測する。

## Non-functional requirements

- **検証可能性**: すべての数値・PR 番号が再実行可能なコマンドと測定 ref を持つ。
- **可逆性**: Inbox 1 行の追加であり、蒸留本文を書き換えないため定期蒸留で削除できる。

## Constraints

- 蒸留済み本文への直接追記禁止。
- AI による PR マージ禁止。
- coverage 計測を本 intent の内側ループで回さない(single-owner)。

## Assumptions

- `coverage-patch-quick` はこのワークスペースで有効(`amadeus/config.json`)。配布先の既定有効化はしない。
- #2962 は TDD 適用明確化であり、本追記と役割が重ならない。

## Out of scope

- プラグイン実装の変更、CI workflow の変更、allowlist 正本の変更。
- 蒸留ラウンドでの本文昇格。
- Project Coverage Gate の閾値変更。
- 配布バンドルでのプラグイン強制有効化。

## Open questions

なし。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-14T06:25:54Z
- **Iteration:** 1
- **Scope decision:** none

FR-1 to FR-15 cover Inbox-only append, advisory versus blocking, measured citations, single-owner non-contradiction, standalone PR, and no-merge. Upstream cites only the architecture current section and re-scan.

### Findings

- None
