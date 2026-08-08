# Design Decisions(ADR)— 260807-stage-perf-report

上流入力(consumes 全数): requirements(FR/NFR/C/OQ を裁定対象として消費)、architecture(codekb — 監査イベント面・正規化層・読み手生態の実測を各 ADR の根拠として消費)、component-inventory(codekb — 既存 tool 群との命名・責務衝突の確認に消費)

## ADR-1: 実装形態 — 新規 CLI(`amadeus-subagent-stats.ts` の拡張ではなく)

- **Context**: C-4 が実装形態の裁定を本ステージへ委譲。requirements の集計軸(ステージ窓・idle 減算・record パース・センサー)は subagent 軸と別ドメイン。
- **Decision**: 新規 CLI を `packages/framework/core/tools/` に新設する。`amadeus-subagent-stats.ts` は無変更(C-2)。
- **Consequences**: 既存ツールの挙動・テスト(t460/t461)は不変。UNKNOWN 契約・exit ladder・measurement-ref-first などの**契約**は新 CLI が鏡映する(コードは共有しない — `recordFromLine` は file-private、`scanAuditCorpus` は subagent 型固定のため)。
- **Alternatives Rejected**: (a) subagent-stats の拡張 — 468 行の単責務ツールへ別ドメインの 6 責務を同居させ、C-2 の「挙動不変」保証をテスト面で複雑化する。(b) 既存 `amadeus-runtime.ts summary` への追加 — runtime-graph.json 由来で遡及不能(gitignore・`git ls-files` 0 件)という構造制約が解消できない。
- **Reversibility**: **高(easy to change)** — 新規ファイル 1 点の追加で既存ツールは無変更。廃止はファイル削除+テスト/coverage registry の追随のみで、他コンポーネントへのロックインなし。

## ADR-2: 正規化層 — `amadeus-journal.ts` の exported 層を再利用

- **Context**: C-3 が「`amadeus-journal.ts` の exported 正規化(`journalRecordField:130` / `readJournalRecords:534`)の再利用を第一候補」と指定。
- **Decision**: 第一候補どおり採用する。シャード読取と 2 世代正規化は `readJournalRecords` / `journalRecordField` を消費し、第 3 の正規化実装を作らない。
- **Consequences**: FR-1b(両世代正規化)が既存のテスト済み層に乗る。`amadeus-subagent-stats.ts:21-23` の依存方向裁定(stats → observability のみ、amadeus-lib 非依存)は**本 CLI にも同型で適用** — 新 CLI は `amadeus-journal.ts` のみに依存し、`amadeus-lib.ts` を import しない(project-dir 解決は subagent-stats `:377-386` の dot-dir leaf 判定 idiom をローカル鏡映)。
- **Alternatives Rejected**: (a) subagent-stats 式のローカル正規化再実装 — 第 3 実装の分裂(c1-drift-canonical-renderer と同族の drift 源)。(b) amadeus-lib への共通化移設 — 依存方向裁定に反し、lib の肥大と全ハーネス再検証を招く。
- **Reversibility**: **高〜中** — 依存は関数境界 2 箇所(`readJournalRecords` / `journalRecordField`)に閉じるため、将来ローカル実装へ差し替える巻き戻しは局所リファクタで可能。ただし採用中は `amadeus-journal.ts` の契約変更へ追随する義務を負う(繰延コスト)。

## ADR-3: 命名 — `amadeus-stage-stats.ts`

- **Context**: C-1 が `amadeus-observability` 名前空間を禁止(既存の fail-open **書き手** seam と逆契約)。
- **Decision**: `packages/framework/core/tools/amadeus-stage-stats.ts`。兄弟ツール `amadeus-subagent-stats.ts` と対になる命名(軸 = stage vs subagent)。
- **Consequences**: 責務が名前から読める。component-inventory 実測で衝突なし(`stat|report|metric` 一致は norm-metrics / pr-convergence-report-format / subagent-stats のみ)。
- **Alternatives Rejected**: (a) `amadeus-observability-report.ts` — C-1 違反(逆契約の名前空間同居)。(b) `amadeus-perf-report.ts` — 「perf」はベンチマーク系(t258-p95 等)と混同する語彙。
- **Reversibility**: **出荷前は高 / 出荷後は低(locked in)** — マージ後は全ハーネス dist・docs・ユーザー呼び出し面に名前が固定され、リネームはユーザー可視の契約変更(仕様変更エスカレーション対象)+全ハーネス再生成を要する。命名裁定は本ステージのゲートで確定させる。

## ADR-4: `--json` の採用(OQ-3 の申告付き裁定)

- **Context**: OQ-3。scope-document の出力列挙(Markdown / CSV)に `--json` は含まれず、requirements は本裁定を本ステージへ委譲した。
- **Decision**: `--json` を**採用**する。これは scope-document の出力列挙に対する**申告付きの追加**である(無申告拡大ではない — 本 ADR が申告であり、ステージゲートの人間承認が裁定になる)。
- **Consequences**: (i) 統合テストの assert が構造化データで書け、出力文言への brittle な結合を避けられる(t461 既習形) (ii) 既習 CLI idiom(subagent-stats)との対称性維持 (iii) FR-6 の AC は Markdown/CSV に対して定義済みのまま — `--json` には「Maps の固定順序化(count-desc, key-asc)」の決定性契約を追加適用する。
- **Alternatives Rejected**: (a) 不採用 — テストが人間可読出力の文言に結合し、文言改善のたびに壊れる。(b) JSON を唯一の出力にする — scope-document の人間可読契約(Markdown)を破る。
- **Reversibility**: **中** — 追加自体は Markdown/CSV と独立で他形式へ影響しない。ただし出荷後の `--json` 撤回はユーザー可視の契約破壊(仕様変更エスカレーション対象)となるため、採用の巻き戻しは出荷前に限り容易。

## ADR-5: 統計・減算コアの純関数分離

- **Context**: NFR-2(unit = 純関数 / integration = 実 FS)、NFR-3(in-process seam)。
- **Decision**: 窓構成・idle 減算・統計(mean/median/p95 nearest-rank)・review-block パース・レンダリングを**引数完結の純関数**として export し、FS 走査(`readJournalRecords` 消費)と CLI shell を分離する。`export function main(argv)` + `import.meta.main` ガード。
- **Consequences**: t481(unit: 純関数)/ t482(integration: 実 FS+CLI spawn)の twin 分割が素直に成立。p95 は `tests/lib/percentile.ts` の意味論(nearest-rank、空→NaN 伝播)を**鏡映実装**(import しない — 出荷境界)。
- **Alternatives Rejected**: (a) CLI 一体型 — spawn 盲点で lcov 計測不能(bun-coverage-spawn-blindspot)。(b) tests/lib/percentile.ts の import — 出荷 core が tests/ を参照する境界違反。
- **Reversibility**: **中〜高** — 外部契約を持たない内部構造の裁定であり、一体化への巻き戻しはファイル内リファクタで可能。ただしテスト構造(t481 unit / t482 integration の twin 分割)と patch coverage gate がこの分離に依存するため、巻き戻し時はテスト再編を伴う。

## ADR-6: 未クローズ idle・除外バケットの取り扱い(FR-2c の機構化)

- **Context**: FR-2c は除外+件数報告を要求。黙示既定での救済は禁止。
- **Decision**: 除外バケットは閉集合の判別 union(`unmatched-start` / `orphan-complete` / `unclosed-idle` / `zero-second` / `unparseable-review-heading` / `broken-line` / `unreadable-shard`)として型で列挙し、レポートの measurement ref 直下に全バケットの件数を必ず出力する。
- **Consequences**: 「報告忘れ」が型追加時のコンパイル境界で捕まる(parse-don't-validate)。落ちる実証(NFR-5)は各バケットへの fixture 注入で赤を確認する。
- **Alternatives Rejected**: (a) 文字列ラベルの ad-hoc 集計 — バケット追加時の報告漏れが無音になる(検証劇場 Forbidden の予防)。(b) 除外せず黙示既定で救済(未クローズ idle を 0 秒扱い、unmatched-start に仮の終端を補う等)して母集団へ含める — FR-2c が明示的に禁止する「黙示既定での救済」に直接該当し、統計を無音で歪める。
- **Reversibility**: **中** — バケットの内部表現(判別 union)の変更は型に閉じ容易。ただしバケット語彙と件数はレポート出力(ユーザー可視・FR-2c 契約)に露出するため、バケットの改廃は出力契約の変更を伴い、出荷後は申告付きの仕様変更となる。
