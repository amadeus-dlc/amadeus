<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-17T18:54:55Z — 本stageは新しいpracticeを発明する場ではなく、既存affirmed contentと現repo evidenceのfreshness再照合として扱った; Way of Working、Walking Skeleton、Testing Posture、Deployment、Code Styleはorg/team/project規則ですでに確定している。
- 2026-07-17T18:54:55Z — repositoryに配線されたSAST/DAST/secret scan/dependency-update設定が0件であることは現状証拠として記録し、本intentで新しいsecurity controlを要求する判断には変換しない; 対象は公開Markdownのbranch hygieneで実行面を変更しない。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-17T18:54:55Z — compiled directive/frontmatterの`mode=inline`とstage-protocol §5に従い、stage本文Step 2の4 Task dispatchは実行しなかった; leaderが2026-07-17T18:53:33Zに旧記述との裁定を行い、pipeline-deploy / quality / developer / devsecopsの4観点をconductorがinlineで分離収集後に統合した。
- 2026-07-17T18:54:55Z — stage本文Sensors節はconsumesなしと記すがengine directiveはCodeKB 6点をconsumesとして確定している; routing authorityと`cid:requirements-analysis:consumes-first-drafting`に従い、全成果物の上流入力行にはdirectiveの6 basenameを記載する。
- 2026-07-17T18:54:55Z — promotion preflightで、正規draftの五節に対し`memory/team.md`には置換先4 headingが不在であるため`practices-promote`が必ずfail-closeすると判明した; `amadeus-state.ts:2848-2877`と`amadeus-lib.ts:5643-5660`を根拠にleaderへ裁定・修正配送を依頼し、promotion前で停止する。
- 2026-07-17T19:00:21Z — E-PD1は独立投票3/3・全員GoA5でAを採用し、欠落canonical H2だけを決定順に原子的upsertし既存H2はreplaceを維持する正規修正へ裁定した; 本intentの成果範囲を拡張する変更ではなく、`practices-discovery` stageの正常なpromotion経路を成立させるblocker修正というscope deviationであり、e2のmissing / replace / re-run / 失敗原子性テスト済みcommit配送後までpromotion前停止を維持する。
- 2026-07-17T19:26:18Z — E-PD1修正取り込み後のpromotionはexit 0で`PRACTICES_AFFIRMED`をemitしたが、`Way of Working`のH2置換が配下の6 H3と52 CIDも削除するtarget差分を生成したため、成功JSONを完了根拠にせずgate/reportを停止した; `team.md`は263→210行、H3は9→3、CIDは190→138、diffは+17/-70、hashはpre-promotion `d8afae274fb5348866595f013f738c08c30a3052`→破壊後`8fcd01ce1bbfc7c40811be7fae4bb2f61ae92d6f`で、auditには2026-07-17T19:25:42Zのtool-owned `PRACTICES_AFFIRMED`が1件残る。preflightでcanonical H2各1件・既存top-level保持・原本hash不変だけを検査してtmp側の内容消失を見逃したため、再実行では既存nested normのcontent-preservationを明示検査する。
- 2026-07-17T19:28:21Z — E-PD2はA案を独立投票3/3・全員GoA5で採用し、ユーザー明示指示によりnested normを保存する安全修正と別Draft PRをe2が担当することになった; 修正commit配送までは破壊的team.md diffとtool-owned `PRACTICES_AFFIRMED` auditを復元せず保持し、gate / report / §13 / promotion再実行を停止する。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-17T18:54:55Z — discovered-rulesは既存Mandated/Forbiddenの重複appendを避け、新規hard constraint 0件として形だけを保持する方針とした; evidence refreshで既決規則の機械適用だけを再確認したためである。
- 2026-07-17T18:54:55Z — branch戦略はremote branchの残存数でなくaffirmed GitHub Flow/trunk規則と`origin/main` first-parent直近50のmerge commit 0件を根拠に判定した; 古いremote branchの存在だけでは寿命や現運用を確定できない。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
<!-- 解決記録(2026-07-17T19:46:24Z): E-PD1の欠落H2とE-PD2のnested norm消失は、安全修正29676e4c2cb38fc9a9bacc2ed9bcb5e64eed1e4bの取り込みとcopy preflightを経て解消した。本promotionはunmanaged Way of Working 16,672 bytes、H3 9、CID 190を保持し、managed block 5件一意・project hash不変・再実行hash同一を確認した。 -->
