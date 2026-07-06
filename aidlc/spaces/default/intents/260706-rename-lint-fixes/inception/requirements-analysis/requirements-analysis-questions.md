# Requirements Analysis 質問（260706-rename-lint-fixes）

対象 Issue: [#537](https://github.com/amadeus-dlc/amadeus/issues/537)、[#538](https://github.com/amadeus-dlc/amadeus/issues/538)、[#540](https://github.com/amadeus-dlc/amadeus/issues/540)

回答は leader ディスパッチ（承認者 j5ik2o、2026-07-06 10:48 JST）、各 Issue の確定記載、engineer3 とのピア確認（decision 記録済み）からの出典付き転記である。新規の人間質問はない。

現行構造の前提は上流入力の [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)、[codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md)、[codekb/amadeus/api-documentation.md](../../../../codekb/amadeus/api-documentation.md) に依る。

---

## Q1. 束ねの単位と実行順序は？

A. 1 Intent に束ね、Bolt 3 本直列（B001=#537 → B002=#540 → B003=#538）
B. Issue ごとに別 Intent
X. Other (please specify)

[Answer]: A（ディスパッチ承認要旨の転記。3 件とも小粒のエンジン隣接 bug で、#537/#540 は同型の rename 漏れ、#538 は隣接する sensor 系。B003 を最後に置くのは engineer3 の #528 先行 merge を吸収してから着手するため = ピア確認済み）

## Q2. #537（scope-table の旧パス ENOENT）の修正方式は？

A. `amadeus-utility.ts` の `skillMdPath()` の解決先を実在パス（`skills/amadeus/SKILL.md`）へ修正し、rename 漏れの全 tools 走査型回帰検査（#507 前例）を eval に常設する
B. scope-table verb を削除する
X. Other (please specify)

[Answer]: A（Issue #537 の実施候補の転記。当該 verb は #489 で SKILL.md の scope 表再生成に実際に使われた機能であり削除しない。scope-table --check の CI（test:all）組み込み要否は設計で判断し、組み込む場合は SKILL.md の表が最新であることが前提になる点を確認する）

## Q3. #540（learnings の sensors 旧名解決）の修正方式は？

A. `amadeus-learnings.ts:84` の解決パターンを `amadeus-${sensorId}.md` へ修正し、sensors 実ファイル走査の回帰検査を eval に常設する
B. sensors ファイル側を aidlc-*.md へ改名する
X. Other (please specify)

[Answer]: A（Issue #540 の実施候補の転記。B は #445 の engine-namespace 改名方針に逆行する。#507 の全 tools 走査と同型の検査を sensors にも広げる）

## Q4. #538（linter sensor の実質 no-op）の対処方式は？

A. Issue 候補 1（linter sensor を実 linter のラップへ変更）を基本線とし、配布エンジンの汎用性を保つ具体方式（repo 固有パス `lints/check.ts` の直書きを避ける解決）は functional-design で確定する
B. 候補 2（文書の記述訂正のみ）
C. 候補 3（eslint 正式導入）
X. Other (please specify)

[Answer]: A（ディスパッチ「#538 の対処方式は Issue 記載の候補から設計で確定（候補 1 が有力）」+ engineer3 ピア確認「候補 1 は #528 の設計と無矛盾で相性が良い」の転記。C は npm 依存を増やさない方針と衝突（Issue 記載どおり非推奨）。B は #528 の新 rule が gate で効かないままになり Issue 背景を解消しない。設計論点: エンジンは配布物なので、`.agents/rules/`「repo の開発用スクリプトを skill の実行時参照として書かない」と両立する汎用機構（例: 対象 workspace の package.json の lint:check script を検出してラップし、不在なら従来どおり quiet PASS）を候補 1 の実現形として検討する）
