# Issue #1680 Code Generationサマリー

## 結論

[PR #1707](https://github.com/amadeus-dlc/amadeus/pull/1707)で未解決だったFR-1680-1、FR-1680-2、FR-1680-4を本revisionで実装した。Kimi Stopはhost-stamped main sessionだけをcoreへ転送し、unknown／subagentはno-opとする。active subagentのengine／state mutationはruntimeで拒否され、reviewer READYからmain明示承認までの連結flowでstate／audit不変性を確認した。以下の「FR-1680-1の事実確認」から「テスト証拠と不足」はPR #1707時点のレビューbaselineであり、本revisionの結果は次節が正本である。

## 本revisionの実装結果

- `packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts`
  - `SessionStart`でhost-stamped main baselineをatomicに作成し、Stop payloadの非空`session_id`がbaselineと`amadeus/.amadeus-sessions/.current-session`の双方に一致し、`agent_name`がなくactive roleが0の場合だけ`amadeus-stop.ts`へ転送する。
  - Kimi `SubagentStart`／`SubagentStop`をcounted ambient-presence markerへ写像し、並行更新をlock＋atomic renameで保護する。SubagentStart永続化失敗はdeny latchを残し、`SessionEnd`はbaselineを除去する。
- `packages/framework/core/tools/amadeus-caller-authorization.ts`
  - Kimi role markerをparse-don't-validateし、有効baselineと`.current-session`の一致、active role 0だけを許可する。missing／unreadable／malformed／update lock／deny latch／SessionEnd後はfail-closedに拒否する。
- `packages/framework/core/tools/amadeus-orchestrate.ts`／`amadeus-state.ts`
  - `next`、`report`、`park`およびdirect state mutationをstate／audit書き込み前に拒否する。Kimi以外とrole marker不在のmain経路は既存互換とした。
- Kimi hook snippet、Kimi版`SKILL.md`、onboarding、全distribution／promoted self-install面を正本から再生成した。
- `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts`
  - reviewer／support／exploreのadversarial matrix、state／audit byte不変、main互換matrix、reviewer READY→pending carrier→subagent Stop→main明示承認の連結flowを追加した。
- `tests/integration/t-kimi-adapter.test.ts`
  - trusted main Stop forwarding、unknown／reviewer no-op、core decision relayを固定した。

## 検証結果

- focused test: 64 pass、0 fail
- 最終関連回帰（complexity gate＋Kimi hook merge＋adapter＋reviewer boundary）: 121 pass、0 fail、538 assertions
- 全体`test:ci`: 654 files／9,118 assertionsまで実行。最初のhook count同期漏れを修正後、唯一残ったcomplexity ratchetも共通guard分離で解消し、complexity gate単体と関連回帰がgreen。
- `bun run typecheck`: 成功
- `bun run lint`: exit 0（既存cognitive-complexity warningのみ）
- `bun scripts/package.ts --check`: 成功
- 一時`KIMI_CODE_HOME`を使った`bun run promote:self:check`: 成功
- `git diff --check`: 成功

## Architecture Review是正と保証境界

- **host-stamped payloadの一次証拠**: Kimi Code CLI 0.28.1から取得したlive `Stop` fixtureは、非空`session_id`、`cwd`、`stop_hook_active`を持ち、`agent_name`を持たない。さらに手元へ導入済みのKimi 0.29.0実バイナリを検査し、通常のStopが`inputData: { stopHookActive: ... }`で構築される一方、委譲ライフサイクルは別イベント`SubagentStart`／`SubagentStop`の`inputData.agentName`で通知されることを確認した。test commentとfixture assertionでこの契約を固定した。
- **identityではなくambient presence**: `agent_name`不在だけでは任意プロセスの呼出者identityを証明しない。実装はhost-stamped SessionStart baseline、`.current-session`、Stopの`session_id`、active role 0を複合してmain経路を判定する。role markerが証明するのは「現在subagentが存在しない」というambient stateであり、任意のtool callerそのものではない。
- **実行契約**: main conductorはsubagent active中にengine／state mutationを行わない。テストはmainに見えるStop／mutationもactive role中は拒否されることを固定した。認可確認からmutation完了までを単一lockで囲う設計ではないため、この実行契約を破る任意プロセスのTOCTOU競合まではcaller authenticationとして保証しない。
- **fail-closed lifecycle**: missing／malformed baseline、更新lock、SessionEnd cleanup後、SubagentStart marker永続化失敗時のdeny latchをfocused testで検証し、拒否前後のstate／auditがbyte-for-byte不変であることを確認した。
- **complexity ratchet**: `handleNext`とstate CLI `main`へ直接追加した認可分岐は既存CCN baselineを超えたため、分岐を小さな共通guardへ分離した。baseline値を引き上げず、`bun tests/complexity-gate.ts --check`で0 new violations／0 regressionsを確認した。

## 入力

`unit-of-work.md`はexpected absentのため補完せず、`requirements.md`のFR-1680-1〜4、Issue本文、既存Bolt／変更提案証跡からスコープした。

## PR #1707 baselineの実装結果

- Kimi Stop adapterをmain／subagentの両方で観測専用no-opにし、product／architecture reviewer profileを`Read`／`Grep`／`Glob`へ制限した。
- gate approvalをIntent／stage／session／Presence Reservation IDへ束縛し、別質問のHUMAN_TURN流用とRequest Changes後の旧carrier再利用を拒否した。
- Kimi CLI 0.29.0をdoctorの下限とし、正本、全生成面、英日guide、認可／race／audit回帰を同期した。
- cross-harnessの一般的なruntime role認証は[Issue #1700](https://github.com/amadeus-dlc/amadeus/issues/1700)へ分離した。

## FR-1680-1の事実確認

- PR head `37997c8dec1c4a54bebdd07ebe3bbb1b09fb7f59`の`packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts`は、`stop` targetでcore hook callを返さない。
- `tests/integration/t-kimi-adapter.test.ts`はmain／subagent caller shapeをともにsilent no-op、spawn 0件として固定する。
- `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts`もmain session IDありのStopとreviewer session IDなしのStopを同じno-opとして検証する。
- Kimi版`SKILL.md`は主体を信頼できないため「either caller shape」で`amadeus-stop.ts`へ転送しないと文書化する。

これらは相互に一致するため、旧サマリーの「Kimi Stop adapterを観測専用no-op」は誤記ではない。しかし`requirements.md`のFR-1680-1と[Issue #1680](https://github.com/amadeus-dlc/amadeus/issues/1680)受け入れ条件は、識別不能なsubagentへの注入をfail-closedにしつつmain conductorのStop forwardingとpending directive強制を維持するよう要求する。通常の明示forwarding loopまたは次のhuman turnで進行できることは、Stop hook固有契約の代替承認ではない。したがってFR-1680-1は未充足である。

## FR-1680-2の強制境界

| 主体／経路 | 実際の強制 | 判定 |
|---|---|---|
| product／architecture reviewer | `packages/framework/harness/kimi/manifest.ts`が`tools: [Read, Grep, Glob]`を生成profileへ投影し、Kimi 0.29.0のnative custom-agent tool policyがBash／Write／Editを実行前に拒否する | reviewerのtool境界だけ充足 |
| support agent | Kimi版`SKILL.md`は`support_agents`をmain conductorへinline loadする。独立caller identityもrole-aware engine guardもない | FR-1680-2のruntime拒否を証明しない |
| built-in explore | Kimi built-in profileがread-onlyであることへ依存するが、repo-owned profile、engine／state guard、回帰テストはない | 未充足 |
| `next` | `handleNext`はpure readだがcaller roleを検証しない | role拒否なし |
| `report` | incomplete Kimi gateはPresence Reservation carrierなしで拒否するが、reviewer／support／exploreというcaller roleは検証しない | gate provenanceは強化、role authorizationではない |
| `park` | `handlePark`はそのままstate toolの`park`をspawnする | role拒否なし |
| direct state mutation | `amadeus-state.ts`は各transition固有の整合性・presenceを検証するが、reviewer／support／explore callerを認証しない | role拒否なし |

Kimi permission snippetは`Bash(*.kimi-code/hooks/*)`をdenyする一方、`Bash(bun .kimi-code/tools/*)`をallowする。これはhook直呼びへのdefense-in-depthであり、engine／state caller authorizationではない。trusted Kimi sessionも`.current-session`からsession IDを得るだけでroleを証明しない。cross-harness標準化を#1700へ分離したことは、#1680で承認済みのKimi固有FR-1680-2を自動的にscope外へ変更しない。

## テスト証拠と不足

- **確認できた証拠**: `t365`はreviewer profileのallowlist、main／reviewer Stopの両方がno-op、corrupt／conflicting reservation時のstate／audit不変、carrierなしの`report approved`拒否、reviewer READY文字列では承認できないこと、別質問・stale carrierの拒否、reservation付きmain承認と`GATE_APPROVED` provenance、completed reportの冪等性を検証する。
- **adversarialの不足**: reviewer／support／exploreとして`next`／`report`／`park`／direct state mutationを実行し、runtime拒否をassertするmatrixはない。profile本文のallowlist検査はその代替ではない。
- **state／auditの不足**: state／audit byte不変のassertionはcorrupt／conflicting `gate-reserve`に対するもので、role別adversarial mutationに対するものではない。
- **main互換の不足**: mainのgate-reserve／approveとcompleted reportは一部互換性を示すが、mainのStopは要件と逆にno-opであり、mainの`next`／`report`／`park`／state mutation全体をrole guard導入後も許可するmatrixはない。
- **FR-1680-4の不足**: reviewer READY、pending directive、subagent Stop、state／audit不変、main明示承認を単一integration flowとして連結したテストはない。現存するStop no-op caseとreviewer READY／carrier caseは別テストである。

## 主な変更ファイル

- core: `amadeus-mint-presence.ts`、`amadeus-presence-reservation.ts`、`amadeus-orchestrate.ts`、`amadeus-state.ts`。
- Kimi: `amadeus-kimi-adapter.ts`、`amadeus-kimi-lib.ts`、`manifest.ts`、Kimi版`SKILL.md`。
- テスト: `t-kimi-adapter.test.ts`、`t-kimi-doctor-arm.test.ts`、`t-solo-gate-transaction-carrier.test.ts`、`t365-kimi-reviewer-boundary.integration.test.ts`。
- 文書／生成物: Kimi英日guide、全dist／self-install面。

## 検証と配送状況

- [PR #1707](https://github.com/amadeus-dlc/amadeus/pull/1707)本文の実行証跡: coverage 654 files / 9,108 assertions / 0 fail、関連5 files 104 pass、patch coverage 565 covered＋13 allowlisted、typecheck／lint／drift guards成功。
- 2026-07-30のGitHub API再確認では16 success、0 failure、2 skipped、1 neutral（ほか1件はconclusionなし）。typecheck、lint、tests、coverage、distribution contract、plugin conformance、dist／self-install drift、全benchmarkとordered AND gate、CI Successが成功した。
- [PR #1707](https://github.com/amadeus-dlc/amadeus/pull/1707)は2026-07-29T23:27:23Zにsquash merge済み。merge commitは`39b57d92dbae5c6167b2cdf4a93d382a23a4d077`である。
- CodeRabbitの8件の指摘はaddressedまたはwithdrawnとなったが、FR-1680-1／2の契約差は解消されていない。Cursor Bugbotはusage limitで実行されていない。PR本文の「独立再レビュー: APPROVE」は一次レビュー成果物への参照を伴わないため、本サマリーではFR充足の証拠に用いない。

## 現在の残存リスク

- role carrierはambient presenceであり、OSレベルのprocess identityや暗号学的caller capabilityではない。main conductorがsubagent active中にmutationしない既存実行契約と、reviewerのread-only tool allowlistを併用する。
- SubagentStartはcounted marker更新前にdeny latchを永続化する。marker更新だけが失敗する経路はfail-closedだが、runtime directory全体が完全に書込不能で既存baselineの除去もできない障害では、filesystem carrierだけで新たなdeny状態を作れない。この物理的限界をcaller authenticationとして過大表現しない。
- 異常終了で`SubagentStop`が発火しない場合、同一sessionでは安全側にmutationを拒否し続ける。次の有効`SessionStart`だけが新baselineを作り直し、`SessionEnd`／cleanup後はbaseline欠損により拒否を継続する。

## Revision 2 follow-up配送

- [PR #1716](https://github.com/amadeus-dlc/amadeus/pull/1716)をdraftで作成した。commitは`414f7d9aa04b5380b800ab737e10b7e49a88ec61`。
- 最新`main`上でKimi adapter／hooks merge／reviewer boundaryを再実行し、86 pass／439 expectsだった。complexity gateは0 new violations／0 regressions。
- `bun run typecheck`、`bun run lint`、`bun scripts/package.ts --check`、`bun run promote:self:check`は成功した。Linux CIはdraft PRのcheckで確認する。

## Revision 3: gate-reserveキャリア漏洩の塞ぎ忘れを修正

セッション再開時のリカバリで、Revision 2に残っていた認可境界の穴を特定し修正した。

- **検出された穴**: `handleGateReserve`／`handleGateReject`（`packages/framework/core/tools/amadeus-orchestrate.ts`）が`refuseUnauthorizedKimiCaller`を呼んでいなかった。reservation未作成の経路ではstate tool側のガードに偶然阻止されるため従来matrixはgreenだったが、mainが予約済み（reservation存在＋gateオープン済み）の通常フローでは、ambient subagentからの`gate-reserve`がstate変更を伴わないショートカット経路で既存の`presence_reservation_id`キャリアをそのまま返していた。キャリアは承認capabilityであり、無ガードの`gate-reject`と組み合わさるとsubagentがgateをrejectできた（FR-1680-2未充足）。
- **修正**: `handleGateReserve`と`handleGateReject`の先頭に`refuseUnauthorizedKimiCaller(projectDir)`を追加し、引数検証より先にfail-closedで拒否するようにした。共通guard経由の1行呼出のためcomplexity ratchetは不変（0 new violations／0 regressionsを確認済み）。
- **テスト**: `t365`に「ambient Kimi subagent cannot retrieve an existing gate reservation」（予約済み状態からのキャリア取得拒否とstate／audit byte不変）を追加し、adversarial matrixに`gate-reserve`／`gate-reject`とreservationディレクトリ不変の検証を組み込んだ。
- **検証**: `t365` 29 pass／0 fail（247 expects）、Kimi adapter／solo gate carrier／doctor armの関連3 files 75 pass／0 fail、`bun run typecheck`成功、`bun run lint` exit 0（既存warningのみ）、complexity gate OK。
