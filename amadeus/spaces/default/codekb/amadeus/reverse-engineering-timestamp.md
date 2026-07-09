# リバースエンジニアリング実施記録

> 注記: 本ファイルは per-repo codekb store の単一 freshness marker であり、#707 が問題化する「並行リフレッシュで base/observed が相互上書きされる構造」の当事者そのものである。複数 intent が同一 `codekb/amadeus/` を並行更新する現運用では last-writer-wins となる。本記録は intent `260709-integrity-batch`(observed `162553b99`)時点の最新スキャンを表す。#707 の修正で per-intent 記録化が入るまで、過去 intent の base/observed は git 履歴を参照すること。

## 実行メタデータ

- Date: 2026-07-09
- Intent: `260709-integrity-batch`
- Scope: `bugfix`
- Repository: `amadeus`(origin remote 由来、#693 で統一。物理チェックアウトは worktree `claude-engineer-2`)
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う。フルスキャンは行わない)
- Base commit: `a1c79dc12`(前回 intent `260709-bug-zero-batch` の Observed commit)
- Observed commit: `162553b99`(origin/main)
- Focus: 修理対象バグ4件
  - #708 human-presence 偽陽性 — `packages/framework/core/hooks/amadeus-mint-presence.ts`(mint 側 L23-31)+ `amadeus-lib.ts` `humanActedSinceGate`(L1442-1479)/ `verifyDelegatedApproval`(L1480-)(gate 側)
  - #707 codekb 並行リフレッシュ衝突 — `.claude/amadeus-common/stages/inception/reverse-engineering.md`(L5/L36/L110)+ `amadeus-lib.ts` `codekbRepoName`(L556-565)
  - #705 sdk-drive calibration ランナー管理外・doctor ドリフト — `tests/harness/sdk-drive.calibration.test.ts`(L55-72)+ `tests/run-tests.ts`(L31/L577-587)+ `amadeus-utility.ts`(L628 doctor)
  - #706 delivery knowledge の tree 外参照 — `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md:3`(+ `amadeus-delivery-agent.md:71-77`)
- ベースにした codekb: `amadeus/spaces/default/codekb/amadeus/`(2026-07-09、intent `260709-bug-zero-batch`、対象バグ #674/#675/#676/#677/#678/#668)

## 分析範囲

`git diff --name-status a1c79dc12..162553b99` で **227ファイル**の差分を確認した(15コミット、A=44 / D=18 / M=165)。主なクラスタと含意は次の通り。

- `amadeus/`(工程記録・codekb・memory)= 72。うち `codekb/claude-leader/`(9)と `codekb/claude-engineer-1/`(9)の **削除(D)** = #693(PR)後の codekb 一本化の後始末。`codekb/amadeus/` の 9ファイルは M(前回 bug-zero-batch スキャンの結果反映)。
- `tests/` = 66(#696 派生サイズ分類器 + drift guard・#698/#703 の class-B テスト standalone-green 化)。
- `dist/` = 45(生成物。core 変更の伝播)、`packages/` = 14、`docs/` = 6、他。
- 主なコミット: `909e590d4`(codekb repo 名を origin remote 由来に統一、#693)← #707 の前提、`1289608c6`(first-class delegated-approval provenance、#671/#681)← #708 の前提、`7da09f0c7`(pyramid: derived-size classifier + drift guard、#696/#700)、`611dd1ef8`(class-B テスト standalone-green、#698/#703)、`cb9d19a8e`(human-presence guard を reject に配線、#675/#692)ほか。

今回4バグの焦点コードはいずれもこの差分区間で **未着手**(裏取り済み): `amadeus-mint-presence.ts`(#708)未変更、`sdk-drive.calibration.test.ts`(#705)未変更、`reverse-engineering.md`(#707)未変更、`workflow-planning-guide.md:3`(#706)未変更(L55 のみ #672 で編集)。したがって4バグは差分区間の前後を通じて残存する欠陥であり、#707・#708 は今回区間で入った前提機構(#693 / #671)の隣接領域として顕在化した。

## 鮮度に関する注記

ベースライン `codekb/amadeus/`(2026-07-09、intent `260709-bug-zero-batch`)は #674/#675/#676/#677/#678/#668 という前回バッチ6バグを主眼に書かれており、本 intent の4バグには触れていない。本スキャンはこの前提を次のように更新した。

- 前回6バグの記述(code-quality-assessment の「## 移行しない選択肢の評価」までの節、architecture/code-structure/component-inventory の6バグ節)は**温存**した — bugfix スコープの diff-refresh として、変更のない構造記述をゼロから作り直さない(project.md cid:requirements-analysis:c1 の趣旨)。前回6バグの修理状態は本 intent のスコープ外であり、状態確認は行っていない。
- 今回4バグは各 codekb ファイルに**追記**で反映した(code-quality-assessment に「## 既知の欠陥 — 今回 intent」節、architecture に「## 差分リフレッシュで反映した構造変化」+「## 4バグ焦点領域のアーキテクチャ上の位置づけ」、code-structure/component-inventory に焦点コンポーネント節)。
- `packages/framework/core/`・`packages/setup/` の全体構造(one-core-many-harnesses、Bun/TypeScript/Biome スタック、release.yml 一本化)は前回スキャン時点から変更なし。`business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` は差分に実質変更がなく未更新。

## 合成方針(Architect 実施)

Developer スキャン結果(`inception/reverse-engineering/developer-scan.md`)を入力として、9アーティファクト中4ファイル(architecture / code-structure / component-inventory / code-quality-assessment)を diff-refresh 方式で追記更新した。file:line は self-install ツリー(`.claude/`)を実測面として引用しているが、修正は source of truth の `packages/framework/core/` を編集し `bun scripts/package.ts` + `bun run promote:self` で dist/self-install へ伝播させる(team.md Mandated)。

## 更新した成果物

- `architecture.md`(差分構造変化 + 4バグ位置づけを追記)
- `code-structure.md`(codekb ストア / テストハーネス / knowledge 配布構造を追記)
- `component-inventory.md`(presence/gate・codekb 永続化・テストハーネス・knowledge 配布コンポーネントを追記)
- `code-quality-assessment.md`(「既知の欠陥 — 今回 intent」節に4バグを file:line 付きで追記)
- `reverse-engineering-timestamp.md`(本ファイル)

未更新(差分に実質変更なし): `business-overview.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md`。
