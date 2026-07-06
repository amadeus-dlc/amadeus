# Requirements（260706-runtime-graph-registrati）

対象 Issue: [#558](https://github.com/amadeus-dlc/amadeus/issues/558)（runtime-graph に stage entry が自動登録されず learnings surface が stage not found になる。再発 2 例）

## 意図分析

runtime-graph.json は §13 learnings ritual（surface）と summary/replay の読み口であり、登録漏れは gate ごとの learnings ritual を無言で壊す。同日中に 2 例（engineer4 = 260706-pr-gate-discipline の requirements-analysis、engineer1 = 260706-engine-consistency の code-generation）が観測され、手動 `amadeus-runtime.ts compile` での回復が必要だった。現行構造の把握は [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)（hooks fail-open、エンジン層構成）、[codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md)、[codekb/amadeus/api-documentation.md](../../../../codekb/amadeus/api-documentation.md)（orchestrate / state verb の遷移面）を上流入力として参照する。

## 根本原因（reverse-engineering での実測、本 record の diary 参照）

`amadeus-runtime-compile.ts`（PostToolUse hook）の command filter regex が `.claude/.kiro/.codex/tools/` の path だけを match し、AMADEUS.md が正準とする `.agents/amadeus/tools/` 経由の transition コマンド（`amadeus-orchestrate.ts report`、`amadeus-state.ts` verb）を早期 exit で素通しする。birth 直後の 4 entry（initialization 3 + 先頭 stage）だけ登録されるのは、print directive が `.claude/tools/amadeus-utility.ts intent-birth` を名指しし、その呼び出しだけ regex に match するため。決定的証拠: 本 Intent の reverse-engineering approve を `.claude/tools/` 経由で report したところ、hook が発火し runtime-graph が正しく更新された（completed_at 記録 + 次 stage entry 追加）。

## 機能要求

- FR-1（hook 経路修正）:
  - FR-1.1: `amadeus-runtime-compile.ts` の command filter regex（transition tool 用と orchestrate report 用の 2 本）に `.agents/amadeus/tools/` 経由の呼び出しを追加する。
  - FR-1.2: TDD — hook を stdin payload で駆動する eval を先行追加し、`.agents/amadeus/tools/amadeus-orchestrate.ts report` を含む command で compile が発火して runtime-graph が更新されることを検証する（現状 FAIL = RED）。
- FR-2（surface の自己修復）:
  - FR-2.1: `amadeus-learnings.ts surface` が slug 不在（stage not found）または runtime-graph 不在のとき、`amadeus-runtime.ts compile` を自動実行して再解決する。採用根拠（hook 非依存で surface が呼ばれる具体シナリオ）: (a) hooks は fail-open 設計であり、compile hook の失敗は .amadeus-hooks-health/*.drops へ落ちて graph が gate 時点まで stale のまま残りうる（codekb/architecture.md の hooks 行）。(b) PostToolUse hook が発火しない実行文脈（engine-e2e の CLI 直接駆動、headless / cron 実行）では FR-1 の regex 修正が効かない。(c) ディスパッチ承認要旨（2026-07-06 15:47 JST）が「抜けるパターンへの自動 compile または復旧手順つき明示エラーを実装、engine-e2e に縮退 scope での surface 成立ケースを追加」と自動 compile を実装候補に名指しし、e2e で surface が成立する（= 成功する）ことを求めている。e2e は hook が発火しない文脈 (b) の決定論的実例であり、成立には自己修復が必要である。
  - FR-2.2: 自動 compile 後もなお解決できない場合、および自動 compile 自体が失敗（exit 非 0）した場合は、無言 fail ではなく復旧手順（compile コマンドの明示）つきエラーを出す（fail fast。無言 exit 0 にしない）。
  - FR-2.3: TDD — engine-e2e に縮退 scope（bugfix）で (a)「登録漏れ状態から手動 compile なしで surface が成立する」ケースと、(b)「自動 compile も失敗する状態（audit shard 破損）で復旧手順つきエラー（exit 非 0）になる」ケースを先行追加する（現状 (a) FAIL = RED）。
- FR-3（parity と正準反映）:
  - FR-3.1: 実測結論（2026-07-06、parity-map.json 実測）: `hooks/aidlc-runtime-compile.ts` は engineFileExceptions 未宣言 → 追加する。`tools/aidlc-learnings.ts` は宣言済み → exceptions へ #558 の理由 entry を追記する。
  - FR-3.2: skills/ 正準反映はエンジン tools/hooks に正準コピーが存在しないことを実測記録する（前 Intent #559 で実測済みの再確認）。

## 非機能要求

- NFR-1: 接触面 — engineer3 の #554（apply スクリプト / promote / parity）と非接触見込み。`amadeus-learnings.ts` に触れるため #559 B002 との整合を確認した。実測結果（git show 076c48de --stat）: B002 の変更ファイルは validator 4 ファイル + eval 1 ファイルで `amadeus-learnings.ts` に非接触。確認記録は本節（この実測結果）と code-generation の code-summary.md に残す。
- NFR-2: 成果物・PR は日本語、TS は英語。PR は draft で作成し、3 条件充足で Ready 化。

## 受け入れ条件（Issue AC と対応）

| # | 受け入れ条件 | 対応要求 |
|---|---|---|
| 1 | `.agents/amadeus/tools/` 経由の transition コマンドでも runtime-graph が自動更新される（先に fail する hook eval つき） | FR-1 |
| 2 | 縮退 scope の Intent でも learnings surface が手動 compile なしで動作し、自動 compile 後も解決不能な場合・自動 compile 自体が失敗した場合は復旧手順つきエラー（exit 非 0、無言 fail なし）が出る（先に fail する engine-e2e ケースつき） | FR-2 |
| 3 | parity-map.json の engineFileExceptions に `hooks/aidlc-runtime-compile.ts` が追加され、exceptions に #558 の理由 entry（learnings 含む）が追記され、`npm run parity:check` ok | FR-3 |
| 4 | `npm run test:all` pass、validator（260706-runtime-graph-registrati 指定）pass | 全要求 |

## スコープ外

- surface の 0 件バグ（memory_path prefix 欠落。Corrections 記録済みの既修正）の再修正。
- runtime-graph の compile 方式そのもの（audit + memory walk）の再設計。
- 他 harness（.kiro / .codex）での実機検証（regex は同時に対応するが、実機確認は当該 harness 利用時）。
