# Requirements — 260720-diary-autogen-guard(Issue #1279)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

> 測定 ref: file:line は RE observed HEAD(re-scans/260720-diary-autogen-guard.md、鮮度ポインタと同一系)での実測。
> business-overview.md: 通読のうえ本文裏付けには**不参照(N/A)** — 過去 intent の業務境界履歴で engine diary 機構への言及 0件(grep 実測)。本 intent の文脈は Issue #1279+RE record が一次資料。architecture.md(engine/state 層の構成)と code-structure.md(core 中立層と dist 投影 — 修正は dist×6/self-install 従属)は §2/§5 で実参照。
> consumes 宣言の残り3点(intent-statement / scope-document / team-practices): **N/A** — bugfix degrade で ideation・practices-discovery SKIP、当該成果物は本 record に不在。

## 1. Intent 分析

[Issue #1279](https://github.com/amadeus-dlc/amadeus/issues/1279)(bug / P3 / S4-MINOR、クロスレビュー2名成立+RE で根本原因確定)の修正。run-stage 発行 chokepoint(orchestrate.ts:1172)の diary 自動生成 guard `recordPrefix !== null` が、**「birth 前の正当 skip」と「intent 実在だが cursor/pd 解決失敗のバグ skip」を無音混同**し、環境条件(CLAUDE_PROJECT_DIR が cursor 非解決ツリーを指す)で diary が生成されない。audit 系は `--intent` 明示アンカー(amadeus-audit.ts:433)で cursor 非依存 — diary 経路のみ非対称に脆弱。pd 差し替えのみの決定的再現(FIRES↔SKIPPED)取得済み。

原因の所在: 260718-election-ts-foundation 以前からの **engine 設計**(chokepoint 導入 #1088 時点で guard の二義性が存在 — bootstrap 由来ではなく #1080/#1088 系の設計時見落とし)。

## 2. 現状の実測(RE 確定事実)

- 一次原因: `recordPrefix === null`(codekbCtx 枝は除外 — codekbCtxFor :889-891 は実経路で常に truthy)。null ⟺ activeIntent(pd)=null(relativeRecordDir、lib.ts:1223-1224 で null 伝播)。
- pd 支配: resolveProjectDir(lib.ts:211-235)は ①explicitDir ②CLAUDE_PROJECT_DIR(:216)③script-path(:221-223)④cwd — env 優先が環境固有性の根。
- 決定的再現: 同一コード・pd 差のみで反転(pd=worktree(cursor あり)→ FIRES / pd=main checkout(cursor なし)→ SKIPPED)。
- 非対称: audit/report/state 系は --intent 明示アンカーで cursor 非依存(「audit は正シャード・diary だけ不発」の説明)。
- **訂正(reviewer C-1)**: memoryPathFor(orchestrate.ts:593-596)は `recordPrefix ?? relativeSpaceRecordPrefix()` で prefix を構成 — **recordPrefix null のバグ条件下では memory_path 自体が intent slug を欠く**(lib.ts:1360-1362 の bare prefix fallback、`--intent` フラグも 0件)。アンカー材料は chokepoint に既在**しない** — cursor 非依存の intent 特定手段の新設が必要。
- 過去 ❌ 時点の env 実値は復元不能(gitignored+未ログ)— 回帰は再現条件の注入で固定する。

## 3. 機能要件

- **FR-1(明示 intent アンカー)**: 【E-DAGRA1 裁定 = A(03:17:37Z、3-0、留保なし)— **前提訂正あり(裁定追認待ち)**】ensureStageDiary の駆動を cursor 再解決に依存させず**明示 intent アンカー**で行う(audit 系と対称化 — 裁定の本質)。ただし裁定選択肢 A の文中の「memory_path 由来(slug 既含)」は reviewer C-1 で反証された(§2 訂正参照)— **アンカー材料の調達手段(cursor 非依存の intent 特定: 発行フロー上流で解決済みの intent の明示受け渡し等)は design(CG plan)の未決事項として委譲**し、前提訂正の追認は leader へ申告済み(ruling-premise-closure-verification)。受け入れ基準: RE の再現条件(多 intent+cursor 非解決 pd)で「intent 実在 ⇒ diary 生成」の不変条件が成立(現行コードでは fail する回帰テスト)。
- **FR-2(バグ skip の loud 化)**: 【E-DAGRA2 裁定 = A(3-0、GoA 1x2 2x1)】record dir 実在×recordPrefix null のバグ skip を stderr advisory で loud 化(stdout-directive-stderr-advisory 契約に整合)。**【留保転記(e4, GoA2)】Q1=A 採用後に本分岐が実行到達可能かを design(CG plan)で机上トレースし、到達可能な残余異常経路を1つ以上明記する — 到達不能なら分岐は書かない**(消費されない検証分岐の残置は検証劇場 Forbidden 隣接)。到達可能なら defense-in-depth として妥当。
- **FR-3(スコープ限定)**: 【E-DAGRA3 裁定 = A(3-0、留保なし)】修正面は diary 経路(orchestrate.ts chokepoint+lib.ts ensureStageDiary 系)に限定。pd 解決順の見直しは**別 Issue(e1 起票担当)**、cursor lifecycle は #1258 着地面に非接触。
- **FR-4(テスト)**: (a) 再現条件の integration 層回帰テスト(fs-tests-integration-first — 多 intent record+cursor 非解決 pd を fixture 構成し、修正前 fail / 修正後 pass の両側) (b) 正当 skip(birth 前 shell)が引き続き skip されること(不変維持) (c) 落ちる実証は E-GMECG 追補準拠(fix コミット後・SHA 明示復元)。

## 4. 非機能要件

- **NFR-1(既存挙動の保存)**: 正常経路(cursor 解決可)の diary 生成・既存 template・冪等性(既存 diary 非上書き #1080)は不変。
- **NFR-2(契約)**: stdout = directive JSON / stderr = advisory の分離を維持(loud 化は stderr のみ)。
- **NFR-3(CI)**: typecheck / lint / --ci / dist:check / promote:self:check green — 修正は core 正本につき **dist×6+self-install 4 の再生成必須**(11コピー同期、goa intent と同型)。push 前 lcov 未カバー 0。

## 5. 制約

- 修正面: packages/framework/core/tools/amadeus-orchestrate.ts+amadeus-lib.ts(diary 経路のみ)+tests/+dist/self-install 従属。並行3 intent は scripts/・team-ops 面で非交差(RE 目録確認済み — e2 #1258 は着地済み面、実 diff 再判定を CG 前に実施)。
- Bolt 単一・スカッシュ・no-AI-merge。resume 時は c2 追補(新規 Agent 優先/worktree 再掲+cwd 実測)。

## 6. 前提

- **(C-1 訂正済み)** memory_path は recordPrefix 由来であり、バグ条件下(recordPrefix null)では slug を欠く — FR-1 のアンカー材料は memory_path から調達**できない**。正常経路では memory_path は正しい slug を含む(RE の ✅ 実測はこの正常経路のみ)。
- FR-4(c) の E-GMECG は選挙裁定(team.md 未収載)— design/CG 段では正典化済みの近縁 cid(falling-proof-injection-one-set 系+falling-proof-no-stash の E-GMECG 追補)への読み替えを許容する(reviewer M-1)。

## 7. スコープ外

- pd 解決順(CLAUDE_PROJECT_DIR 優先)の変更 — 別 Issue(FR-3、ADR 前提)。
- cursor lifecycle(#1258 済み)。他の ambient-cursor 依存箇所の一括是正キャンペーン。

## 8. 未決事項

なし — Q1〜Q3 は E-DAGRA1〜3(03:17:37Z 開票、各 3-0)で裁定済み。留保1件(Q2 e4)は FR-2 へ verbatim 転記済み。
