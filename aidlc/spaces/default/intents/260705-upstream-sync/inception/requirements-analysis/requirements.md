# Requirements（260705-upstream-sync）

対象 Issue: [#428](https://github.com/amadeus-dlc/amadeus/issues/428)（上流 AI-DLC v2（fde1e1af）の既知ドリフトの追跡）

## 意図分析

上流 awslabs/aidlc-workflows v2 の基準 commit を fde1e1af から b67798c3（2.2.0、3 commits）へ更新し、無改変再コピーと `parity:check` バイト一致を回復する。あわせて Issue #428 の既知ドリフト 7 項目へ判断を記録し、2.2.0 の新機能 Adaptive Workflows の取り込みを完了する。

上流調査（reverse-engineering 前の先行調査、decision 記録済み）で確定した事実:

- dist/claude の差分 16 ファイルは実質すべて Adaptive Workflows（eae912e）1 機能である（89bcfa2 は version のみ、b67798c は docs のみ）。
- ドリフト 7 項目の対象 5 ファイルは fde1e1af..b67798c3 で未変更であり、症状の行レベル残存を b67798c3 checkout で裏取り済み。
- 現行構造の把握は [codekb/amadeus/business-overview.md](../../../../codekb/amadeus/business-overview.md)（目的・運用モデル）、[codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)（層構成・scope 体系。scope 数 10、audit イベント総数 70）、[codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md)（ディレクトリ構成・eval 28 種）を上流入力として参照する（本 Intent の reverse-engineering で差分更新済み）。

## 機能要求

- R001-baseline-update: 上流 clone（b67798c3）から `dev-scripts/generate-parity-baseline.ts` で `dev-scripts/data/parity-baseline.json` を再生成し、`baselineCommit` を `b67798c37c71855271b70882a33f47890d41f212` へ更新する（Q4 = A。baseline は生成物であり手編集しない）。
- R002-engine-recopy: 上流変更のエンジン 9 tools（audit / graph / jump / lib / orchestrate / runner-gen / state / utility / version）と hooks/amadeus-stop.ts を、nameMappings のトークン置換による無改変再コピーで更新する。当方 fix が上流未吸収のファイル（engineFileExceptions 宣言済み）は、例外を維持したまま上流差分を手動統合する。
- R003-new-adaptations: 新規 3 ファイルを適応コピーする: `agents/amadeus-composer-agent.md`（agent 14 個目）、`knowledge/amadeus-composer-agent/composing.md`、`skills/amadeus-compose/`（上流 38 skill の適応コピー体系に加わる 39 個目。序数は stage-catalog.md の上流由来 skill 集合を指し、ローカル `.agents/skills/` の総数とは別勘定）。適応点は rename と grilling 結線に限定する（Q2 = A）。amadeus-compose は既存 packaging skill 群（amadeus-init、amadeus-bugfix 等）と同カテゴリに置き、公開入口 1 個の契約を維持する。stage-catalog.md と skills/ 正準ソースを同期し、`promote-skill.ts --replace` で昇格する。
- R004-docs-adaptations: `knowledge/amadeus-shared/audit-format.md` へ RECOMPOSED イベント（Navigation、Emitter: amadeus-utility.ts recompose）を反映し、Event Registry を 70 → 71 へ更新する。`skills/amadeus/SKILL.md` の composer conductor block と CLAUDE.md の該当 1 文を適応する。イベント数 pin を使う検査があれば再ベースラインする。
- R005-pdm-retag: 再コピー後、pdm scope の stage frontmatter `scopes:` タグを再付与し、`amadeus-graph.ts compile` と `scope-table` で grid・SKILL 表を再生成する（pdm は恒久の意図的差分。parity 例外は維持）。
- R006-exceptions-cleanup: `engineFileExceptions` を整理する。上流取り込みで内容一致に戻せる例外は解除し、維持する例外は理由を parity-map で追跡可能にする。engineer3 の #507（sensor×3 / swarm / validate の 5 ファイル）追記との整合を確認する（交差ゼロ確認済み）。
- R007-drift-table: ドリフト 7 項目の判断表（全項目「未修正（継続追跡）」、項目 5 は当方適応維持。b67798c3 での行レベル裏取り付き）を PR 説明に含め、merge 後に #428 をクローズできる形にする。
- R008-grid-coexistence: composed scope（composer が scopes/ ファイルと scope-grid.json を直接書く）と `amadeus-graph.ts compile`（grid を全生成する）の共存規約を functional-design で確定する（Q3 = A。上流は「composer 書き込み後の compile 禁止」を persona 側に持つが、当方は pdm 再付与で compile を常用するため衝突する。設計 gate で人間が再確認する）。
- R009-installer-consistency: dist コピー更新後、インストーラ MANIFEST（エンジン 7 dir / symlink 7 entry / hooks 配線、`scripts/amadeus-install.ts`）との整合を確認し、`npm run test:it:installer` を検証に含める（leader FYI 2026-07-05T23:14:58Z の転記）。R004 の CLAUDE.md 適応文が MANIFEST.amadeusMd の removeBlocks パターンに触れないことも同検証で確認する（reviewer 観察 3）。
- R010-codekb-coordination: codekb/amadeus の衝突は「再生成を正とする」規約で engineer3 の先行 merge に委ね、本 Intent は merge 後 rebase で自分の codekb 変更を落とす。record stub 9 件は維持する（Q5 = A）。

## 非機能要求

- エンジン・skill・スクリプトの変更は TDD で進める（先に失敗する検証、遡及 RED が必要な場合は project.md Testing Posture の規約に従う）。
- 上流ファイルの局所改変を行わない（改変はパリティを崩す。CD001 の継続）。適応点は rename と grilling 結線に限定する。
- 成果物・PR は日本語、SKILL.md と TS スクリプトは英語（Skill Language Policy）。
- 既存記述への変更は差分が要求する箇所に限定する（Surgical Changes）。

## 受け入れ条件（Issue AC と対応）

| # | 受け入れ条件 | 対応要求 |
|---|---|---|
| 1 | 基準 commit 更新の PR で、#428 の 7 項目それぞれに「上流で修正済み / 未修正（継続追跡） / 当方適応を解除」の判断が記録されている | R007 |
| 2 | `npm run parity:check` がバイト一致で pass する（baselineCommit = b67798c3） | R001 / R002 / R005 / R006 |
| 3 | Adaptive Workflows の全面取り込みが完了し、amadeus-compose / amadeus-composer-agent が適応コピーされている | R003 / R004 |
| 4 | composed scope と compile の共存規約が functional-design で確定し、設計 gate で人間確認されている | R008 |
| 5 | `npm run test:all` が pass し、インストーラ MANIFEST と整合している | R009 / 非機能要求 |
| 6 | validator（260705-upstream-sync 指定）が pass する | 全要求 |

## スコープ外

- 上流ドリフト 7 項目の上流への修正報告（Issue #428 の実施候補だが任意。後続判断）。
- pdm scope 以外の新規 scope 追加、composer の当方独自拡張。
- codekb/amadeus の現行 main 分の更新（engineer3 の先行 merge が運ぶ。R010）。
