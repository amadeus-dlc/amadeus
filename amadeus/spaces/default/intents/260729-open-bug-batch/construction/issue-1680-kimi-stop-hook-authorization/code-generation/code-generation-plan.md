# Issue #1680 Code Generation計画

## 入力とスコープ

- 対象: [Issue #1680](https://github.com/amadeus-dlc/amadeus/issues/1680)
- 要件: FR-CROSS-1〜4、FR-1680-1〜4
- `unit-of-work.md`は`amadeus-bugfix`スコープでexpected absentのため補完せず、`requirements.md`、Issue本文、既存Bolt／変更提案証跡からスコープした。
- KimiのStop hook、reviewer tool境界、gate response provenanceに限定し、cross-harnessの一般化は[Issue #1700](https://github.com/amadeus-dlc/amadeus/issues/1700)へ分離する。

## 実装手順

- [x] **Step 1 — Stop hook境界を固定する**: `SessionStart`がatomicに作るmain baseline、host-stamped `.current-session`、非空`session_id`、`agent_name`不在、active role 0がすべて成立する場合だけ`amadeus-stop.ts`へ転送する。baseline欠損／破損／更新中／SessionEnd後、空／不一致session、reviewer、その他subagentはfail-closed no-opとした。
- [x] **Step 2 — role-aware runtime authorizationを実装する**: Kimiの`SubagentStart`／`SubagentStop`からmachine-local ambient-presence carrierを管理し、active subagent中の`next`／`report`／`park`／direct state mutationをstate／audit書き込み前に拒否する。marker欠損／破損／更新lock／deny latch／SessionEnd cleanup後もunknown callerとしてfail-closedとし、SubagentStart永続化失敗時はdeny latchを残す。
- [x] **Step 3 — gate provenanceを予約へ束縛する**: Intent、stage、session、reservation IDへ結び付いたHUMAN_TURNだけを承認に使う。
- [x] **Step 4 — Request Changes再提示を保護する**: 旧carrierを消費し、新しいreservationだけを有効にする。
- [x] **Step 5 — 統合回帰を追加する**: `t365`へreviewer READY→pending approval carrier→subagent Stop no-op→state／audit byte不変→mainの予約済み明示承認を一続きで追加した。reviewer／support／exploreのadversarial mutation matrixと、mainのStop／next／report／park／direct state互換matrixも追加した。
- [x] **Step 6 — 正本から生成面を同期する**: package／promoteで全harness面を再生成し、文書を更新する。
- [x] **Step 7 — テスト構成を確認する**: 既存のBun test runnerと`package.json`の設定を再利用し、新しいtest configが不要であることを確認する。

## 是正実装の検証

- focused test: `bun test --timeout 120000 tests/integration/t-kimi-adapter.test.ts tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` — 64 pass、0 fail
- 最終関連回帰: complexity gate、Kimi hook merge、adapter、reviewer boundaryの4 files — 121 pass、0 fail、538 assertions
- 全体`test:ci`: 654 files／9,118 assertionsまで実行。hook数の固定期待（10→11）を是正後、残った1 failureは認可分岐追加によるcomplexity ratchetだった。guardを共通関数へ分離後、`bun tests/complexity-gate.ts --check`と`tests/unit/complexity-gate.test.ts`が成功した。
- typecheck: `bun run typecheck` — 成功
- lint: `bun run lint` — exit 0。既存のcognitive-complexity warningのみ
- drift: `bun scripts/package.ts --check`、一時`KIMI_CODE_HOME`を使った`bun run promote:self:check`、`git diff --check` — 成功

## Architecture Review是正

- Kimi 0.28.1のlive Stop fixtureは非空`session_id`を持ち、`agent_name`を持たない。手元のKimi 0.29.0実バイナリでも通常のStopは`stopHookActive`だけから構築され、委譲ライフサイクルは別の`SubagentStart`／`SubagentStop`へ`agentName`を載せる。この一次証拠をtest commentとsummaryへ記録した。
- `agent_name`不在だけをcaller authenticationとは扱わない。baseline／current session／active role setとの複合判定とし、role carrierは任意プロセスのidentityではなくambient subagent presenceを証明するものと明記した。
- main conductorはsubagent active中にmutationしないことを既存実行契約として固定した。認可判定とmutation全体を一つの排他区間にするものではないため、この契約外の任意プロセス競合までidentity保証を拡張しない。
- 認可guardの追加で`handleNext`／state CLI `main`のcomplexity ratchetが一時発生したが、既存大関数へ分岐を増やさず小さなguard関数へ分離した。baseline更新による追認は行っていない。

## 完了条件

- reviewer／subagentが人間の承認ゲートを迂回できない。
- 別質問・別stage・別IntentのHUMAN_TURNを流用できない。
- main conductorのStop forwardingとpending directive強制を維持する。
- reviewer／support／exploreのmutation拒否をpromptやprofileだけでなくruntimeで強制し、state／audit不変性とmain互換性をテストする。
- 実装、回帰テスト、生成面同期が変更提案へ存在し、必須CIがすべて成功している。CI Greenだけでは上記の要件欠落を完了へ丸めない。

## 配送確認

[PR #1707](https://github.com/amadeus-dlc/amadeus/pull/1707)は2026-07-29T23:27:23Zにsquash mergeされ、merge commitは`39b57d92dbae5c6167b2cdf4a93d382a23a4d077`である。2026-07-30のGitHub API再確認では16 success、0 failure、2 skipped、1 neutral（ほか1件はconclusionなし）だった。Tests、Typecheck、Lint and complexity、Coverage Report、Dist and self-install drift、CI Successはいずれもsuccessだが、FR-1680-1／2の未充足を覆さない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:15:49Z
- **Iteration:** 1
- **Scope decision:** none

FR-1680の主体制限とruntime authorizationを実装成果物から確認できず、要件との明示的な矛盾もある。Iteration 1の指摘をPR head `37997c8dec1c4a54bebdd07ebe3bbb1b09fb7f59`、merge commit、レビュー履歴、CI、テスト本体で再確認した結果、いずれもsummaryだけの誤記ではなく未解決の実装・テスト欠落である。

### Findings

- **Critical — FR-1680-1は実装矛盾のまま未解決**: `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts`の`routeTarget("stop", ...)`は常に空配列を返し、statefulな`amadeus-stop.ts`を呼ばない。`tests/integration/t-kimi-adapter.test.ts`と`t365-kimi-reviewer-boundary.integration.test.ts`もmainとreviewerの両方についてempty stdout／stderr、exit 0、core hook call 0件を期待する。Kimi版`SKILL.md`も「either caller shape」をno-opと明記する。したがってサマリー表現は正確であり、FR-1680-1および[Issue #1680](https://github.com/amadeus-dlc/amadeus/issues/1680)の「main conductorに対するStop-hook forwarding-loop強制を維持」に実装が直接矛盾する。通常の明示forwarding loopを代替として記載しても、Stop hook固有の承認済み契約は満たさない。
- **Major — FR-1680-2はreviewer profile以外未充足**: repo内で強制されるのは`packages/framework/harness/kimi/manifest.ts`がproduct／architecture reviewerへ投影する`tools: [Read, Grep, Glob]`と、Kimi 0.29.0 native custom-agent tool policyである。`t365`は生成profileからBash／Write／Editが除外されることだけを確認する。permission snippetはhook pathをdenyする一方で`Bash(bun .kimi-code/tools/*)`をallowする。`handleNext`、`handleReport`、`handlePark`およびstate CLIにはreviewer／support／exploreを識別して拒否するcaller-role guardがなく、Kimiのtrusted session解決も共有`.current-session`を読むだけでroleを証明しない。supportはmain sessionへinline load、exploreはKimi built-in profileがread-onlyであるとの文書上の依存に留まり、repo-owned runtime authorizationではない。
- **Major — adversarial／state／audit／main互換の証拠が不足**: `t365`の「reviewer READY」ケースはcarrierなしのKimi `report approved`を拒否し、後続のreservation付きmain承認を許可するためFR-1680-3の証拠にはなるが、caller roleを検証していない。corrupt／conflicting reservation時のstate／audit不変テストもgate-reserve入力検証の証拠であり、reviewer／support／exploreが`next`／`report`／`park`／state mutationを試みるadversarial matrixではない。completed reportの冪等性とmain gate-reserve／approveは一部main互換を示す一方、mainのStopは明示的にno-opで、全mutation verbのmain互換matrixもない。FR-1680-4が要求する「reviewer READY→pending directive→subagent Stop→state／audit不変→main承認」を単一flowで固定したテストも存在しない。
- **配送・レビュー・CIの意味**: PR本文は関連5 files 104 pass、全体654 files／9,108 assertions／0 fail、patch coverage 565 covered＋13 allowlistedを報告し、GitHub CIも必須job Greenでmergeされた。CodeRabbitの8件の指摘はcarrier guard、lock、型、恒真assertion等がaddressed／withdrawnとなったが、上記FR-1680-1／2の契約差はレビューで解消されていない。Cursor Bugbotはusage limitで実行されていない。従ってmerge／CI Greenを要件充足の証拠として扱わない。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-30T00:21:33Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の指摘は成果物へ正確に反映されたが、是正実装は完了していない。FR-1680-1、FR-1680-2、FR-1680-4が明示的に未充足であり、計画のStep 1、2、5も未完了のため、完成実装として引き渡せない。

### Findings

- Critical — FR-1680-1未充足: Kimi Stop adapterはmain conductorを含む全callerでno-opとなっており、識別可能なmain conductorに限ってStop forwardingとpending directive強制を維持する要件へ直接矛盾する。
- Major — FR-1680-2未充足: reviewer profileのRead／Grep／Glob制限は存在するが、reviewer／support／exploreからのnext／report／park／direct state mutationをengine／state実行境界で拒否するrole-aware authorizationがない。Issue #1700への一般化分離は、承認済みのKimi固有要件を変更しない。
- Major — FR-1680-4未充足: reviewer READY、pending directive、subagent Stop、state／audit不変、main conductorによる明示承認を一続きで検証するintegration flowがない。既存の分離テストでは要求された状態遷移とblast radiusを証明できない。
- Major — 認可回帰が不足: reviewer／support／exploreによるadversarial mutation matrix、拒否後のstate／audit不変性、role guard導入後も正規mainの全mutation verbを許可する互換matrixが存在しない。
- Major — stage完了条件未達: code-generation-plan.mdのStep 1、Step 2、Step 5が未チェックであり、code-summary.mdも同じ残作業を明記している。未充足を正確に記録したことは是正証拠だが、コード生成完了やREADYの根拠にはならない。

## Revision 2 follow-up配送

- commit: `414f7d9aa04b5380b800ab737e10b7e49a88ec61`
- draft PR: [PR #1716](https://github.com/amadeus-dlc/amadeus/pull/1716)
- 最新`main`起点の1 commitとして、caller authorization正本、Kimi lifecycle、engine／state guard、テスト、生成済み全harness面を配送した。
- push前検証: 86 pass／439 expects、complexity gate 0 new violations／0 regressions、typecheck／lint／package／promote drift成功。Intent runtimeのstate／auditは含めていない。
