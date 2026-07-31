# open bug一括修正 要件

## Intent分析

本Intentの目的は、2026-07-29T07:52:34Zまでにユーザーが対象として確定したopen bug 7件を、相互の依存関係と共有ファイル競合を管理しながら修正することである。各Issueは独立した価値・回帰テスト・変更境界を持つ1つのBoltとし、各Boltから1本の[GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)を作成する。

対象は次の7件である。

| Issue | 要約 | 種別 |
|---|---|---|
| [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667) | `book-pack-verify`の並列coverage実行時timeout | flaky / performance |
| [#1664](https://github.com/amadeus-dlc/amadeus/issues/1664) | symlink clone-id doctorの間欠exit 1と診断欠落 | flaky / diagnostics |
| [#1663](https://github.com/amadeus-dlc/amadeus/issues/1663) | worktree登録直列性テストのmember作成未完了 | flaky / concurrency |
| [#1662](https://github.com/amadeus-dlc/amadeus/issues/1662) | committed diffとdirty working tree LCOVのsnapshot不一致 | correctness |
| [#1336](https://github.com/amadeus-dlc/amadeus/issues/1336) | safety-wait早期失敗を起動成功と誤認するTOCTOU | reliability / concurrency |
| [#1607](https://github.com/amadeus-dlc/amadeus/issues/1607) | workflow完了前のcursor解放でmirror completion boundaryを喪失 | transaction / lifecycle |
| [#1680](https://github.com/amadeus-dlc/amadeus/issues/1680) | Kimi Stop hookがsubagentから人間の承認ゲートを迂回 | authorization / audit |

変更種別は`amadeus-bugfix`、深度はMinimal、テスト戦略はComprehensiveとする。Minimalは成果物の簡潔さを意味し、7件それぞれの回帰テストや横断検証を省略する意味ではない。

## 上流入力と根拠

要件は次の承認済みまたは実測済み入力に基づく。

- `business-overview.md`: 6件の初期対象、利用者影響、業務上の優先度
- `architecture.md`: audit、mirror、team-up、coverage、book-packの境界と共有変更面
- `code-structure.md`: 各Issueの患部、既存テスト、配布増幅面
- GitHub Issue本文: 各Issueの再現、期待動作、受け入れ条件、クロスレビュー結果
- `requirements-analysis-questions.md`: #1680追加、#1662 fail-fast、Evidence-first完了基準、OTelとの順序に関するユーザー裁定
- [OTel Intent Mirror #1679](https://github.com/amadeus-dlc/amadeus/issues/1679): 2026-07-29T06:10:01Z時点でINCEPTION / reverse-engineering / Running

`business-overview.md`、`architecture.md`、`code-structure.md`はいずれも#1680追加前のReverse Engineering成果物である。そのため#1680の要件はGitHub Issue本文を正本とし、後続Constructionでは実装前に対象ファイルの到達可能なHEADで再検証する。

## 横断Functional Requirements

### FR-CROSS-1: Issue・Bolt・変更提案の1対1対応

- 7件を7つのBoltへ分離する。
- 1つのBoltは1つのIssueだけをclose対象とする。
- 各変更提案の本文には対象Issue、根因証拠、Red、Green、実行した検証を記録する。
- 複数Issueの修正を1つの変更提案へ束ねない。

### FR-CROSS-2: Evidence-first

- 各Boltは、修正前コードで失敗する決定的な回帰テスト、または原因を一意に識別できる制御されたstress証拠を先に確立する。
- flaky系#1667・#1664・#1663は、診断追加、timeout延長、serial化だけでは完了としない。
- 根因が当初仮説と異なる場合、実装前に要件の根因記述と受け入れテストを実測へ合わせて更新する。
- 修正後は対象回帰テストと既存関連suiteの両方をGreenにする。

### FR-CROSS-3: 配布同期

- `packages/framework/core/`または`packages/framework/harness/`を変更するBoltは、正本だけを手編集する。
- self-install面と`dist/`は既存生成スクリプトで再生成する。
- `bun scripts/package.ts --check`と`bun run promote:self:check`を通過させる。
- 生成対象外のBoltは不要な配布差分を作らない。

### FR-CROSS-4: 監査可能な完了

- 各Boltは対象Issueの受け入れ条件とテストを双方向に対応付ける。
- Issueを完了扱いにするのは、対象回帰テスト、関連suite、必須drift guardが成功した後だけとする。
- 環境依存で未実行の検証は成功へ丸めず、未実行理由と再実行条件を記録する。

## #1662 Functional Requirements

### FR-1662-1: snapshot不一致の事前拒否

- `coverage-patch-gate --check`は、patch coverageのdiffまたはLCOV行対応へ影響する未コミット変更を検出する。
- 検出はLCOVとcommitted diffの比較を始める前に行う。
- staged、unstaged、untrackedを含む、`git status --porcelain`がdirtyとして列挙する全変更を対象とする。
- `.gitignore`でignoreされ通常の`git status --porcelain`へ現れない生成物だけはdirty判定へ含めない。

### FR-1662-2: 実行可能なエラー

- dirty状態では非0で終了する。
- stderrは「committed diffとLCOVが異なるsnapshotを参照するため検査できない」ことを示す。
- stderrはcommit、stash、またはclean worktreeでの再実行という解消方法を示す。
- 誤ったuncovered判定やstale allowlist判定を出力しない。

### FR-1662-3: clean checkout互換

- clean checkoutとGitHub Actionsの既存patch coverage契約を変更しない。
- committed branchでのcoverage判定結果は修正前と同じ意味を保つ。

## #1667 Functional Requirements

### FR-1667-1: timeout根因の決定的証拠

- `book-pack-verify`の外側テストtimeout、子process timeout、cleanup時間の関係を同一clockで観測できるようにする。
- 修正前に、並列負荷、子process遅延、cleanup競合のどれが120秒超過と`rm: fts_read failed`を引き起こすかを区別する。
- wall-clock反復だけに依存せず、遅延またはcleanup競合を制御注入できる回帰テストを持つ。

### FR-1667-2: timeout budgetの整合

- 子processへ許可する最大時間とcleanup bufferの合計が、外側テストの上限を超えない契約にする。
- または、実測された並列実行時間に基づきテスト分類と上限を変更し、その根拠を定数またはテスト説明へ記録する。
- 内側の許容時間が外側の上限より長い矛盾を残さない。

### FR-1667-3: cleanupの競合防止

- 並列workerが利用中の一時ディレクトリを別workerまたは親processが削除しない。
- cleanupは冪等で、既に消えた一時資産を原因にテスト全体を偽赤にしない。
- 実際のpack検証失敗はcleanupノイズと区別して非0で報告する。

## #1664 Functional Requirements

### FR-1664-1: 非0終了時の診断保存

- t224のsymlink clone-id doctorケースが非0になった場合、起動コマンド、status、stdout、stderr、終了経路をassertion messageまたは保存ログから取得できる。
- symlink fixtureの論理パスと実体パスを秘密情報を含めず識別できる。
- 成功時はstdout・stderrの診断dumpを追加せず、現行の通常出力を維持する。追加診断は非0終了時だけに出力する。

### FR-1664-2: 根因の制御再現

- symlink解決、clone-id導出、process起動、fixture cleanupの各段階を個別に遅延または失敗注入できる。
- 修正前コードで観測されたstatus 1へ到達する決定的ケースを確立する。
- 診断追加だけでIssueを完了にせず、確定した根因を最小修正する。

### FR-1664-3: clone-id契約の維持

- 同一のsymlinkを指すinstalled doctorは安定したclone-idを導出する。
- symlink targetの内容またはmetadataを不要に変更しない。
- Linux CIとmacOSの双方で既存のclone-id互換を維持する。

## #1336 Functional Requirements

### FR-1336-1: 明示的readiness handshake

- safety-wait supervisorは、引数検証、activation、run identity確認、初回adapter準備が完了した後にだけreadyを通知する。
- 通知手段はprocess生存確認や固定sleepだけに依存しない。
- ready通知はrunとroleに結び付き、別runまたは古いmarkerを受理しない。

### FR-1336-2: bounded startup判定

- launcherは「ready通知」「ready前の子process終了」「bounded timeout」のいずれかを待つ。
- ready前の終了は終了コードにかかわらず起動失敗とする。
- timeoutは失敗したroleと待機状態を診断へ含める。
- 全roleのreadyを確認するまでlauncherは成功終了しない。

### FR-1336-3: rollback

- 1 roleでもready前に失敗またはtimeoutした場合、そのrunで起動済みの全supervisorを停止する。
- rollback後にPID、marker、recordなどの起動途中資産を残さない。
- 初期化遅延後の`exit 9`を制御注入し、CPU負荷に依存せず修正前Red・修正後Greenを得る。

## #1663 Functional Requirements

### FR-1663-1: member単位の完了証拠

- team-upのworktree作成は、各memberについてcheckout、record生成、Git registrationの結果を個別に追跡する。
- `engineer-4`など任意のmemberが未完了の場合、どの段階で止まったかをstderrまたは保存ログへ出す。
- 全memberの完了証拠が揃うまでrunを成功にしない。

### FR-1663-2: serial registrationと完了観測の整合

- `git worktree add`の直列化を維持する。
- registration lockの解放を、当該memberの必要な後処理完了より先行させない。
- 固定時間後の一回観測だけで「作成未完了」と判定しない。
- 遅延するmemberを制御注入し、修正前の早すぎる完了判定を決定的に再現する。

### FR-1663-3: #1336との順序

- `team-up.sh`の共有変更面を持つため、#1336の変更を取り込んだ後に#1663を実装する。
- #1336のreadiness契約を壊す競合解消や二重待機を導入しない。

## #1607 Functional Requirements

### FR-1607-1: durable completion instance

- final stage approval時に、再試行しても同一となるworkflow-completed boundary instanceを永続化する。
- construction phase receiptとworkflow-completed receiptは別の発火条件とidentityで評価する。
- construction phase receiptの存在だけでworkflow-completed boundaryを抑止しない。

### FR-1607-2: completion saga

- final sync、Project Done、close、または契約上の明示skipを、workflow完了確定より前に直列化する。
- mirror operationの途中失敗では、registryを`complete`にせずactive-intent cursorを維持する。
- 再試行は同一receipt、expectedPrompt、outboxから収束し、GitHub側の操作を重複させない。

### FR-1607-3: landing evidenceとaudit seal

- landing evidenceを、registry=`complete`の事後観測だけでなく同一completion transactionの証拠へ結び付ける。
- completion receipt、expectedPrompt、outbox、mirror state transitionに必要なauditは、registryを`complete`にする前のcompletion transaction内で永続化する。
- mirror chain確定後にregistry completeとaudit sealを適用し、それ以降はmirror専用を含むcomplete後append経路を設けない。
- `ARTIFACT_UPDATED`をcomplete後に再許可しない。

### FR-1607-4: cursor終端処理

- mirror chain確定後に`WORKFLOW_COMPLETED`、registry complete、audit seal、active-intent cursor clearを終端処理として行う。
- multi-intent workspaceで最終report直後のcompletion処理がactive intentを解決できる。
- lone-intent fallbackの有無に結果を依存させない。

### FR-1607-5: crash/retry

- final sync前、Done反映後、close前、audit seal前、cursor clear前の各失敗点から再試行可能にする。
- 再試行後は外部Issue、receipt、audit、registry、cursorが単一の完了状態へ収束する。

## #1680 Functional Requirements

### FR-1680-1: Stop hookの主体制限

- Kimiのforwarding-loop Stop hookはmain conductorにだけ指示を注入する。
- reviewer、support、explore、その他委譲subagentではno-opとする。
- agent identityを検証できない場合はfail-closedで注入しない。
- main conductorのpending directive強制は維持する。

### FR-1680-2: engine mutationのruntime authorization

- reviewer、support、explore roleからの`next`、`report`、`park`、state mutationをruntimeで拒否する。
- prompt上の禁止やsubagentの善意だけに依存しない。
- adversarialなhookまたはuser messageから同じコマンドを要求されても状態とauditを変更しない。
- 正規main conductorの操作は既存契約どおり許可する。

### FR-1680-3: gate response provenance

- `GATE_APPROVED`は、対象stageの承認質問に対応して予約されたHUMAN_TURNだけを消費する。
- §13 learning、通常質問、別stage、別intentのHUMAN_TURNを承認へ流用しない。
- reviewer READYはreview完了の証拠であり、人間のstage承認とは扱わない。
- recovered gate-startでも対象gate responseとの対応を検証する。

### FR-1680-4: regression flow

- Kimi reviewerがREADYを返し、pending directiveが残った状態でsubagent Stop hookを発火するintegration testを追加する。
- subagent終了後もrequirements-analysisはawaiting approval以前の適切な状態を維持し、`GATE_APPROVED`と次stage開始を記録しない。
- その後のmain conductorによる明示的な人間承認だけがstageを進める。

## Non-Functional Requirements

### NFR-1: Reliability

- concurrencyとcrash/retryに関するテストはwall-clockの偶然ではなく制御注入を優先する。
- bounded waitは成功・早期終了・timeoutの全分岐を持ち、無限待機しない。
- retry可能な操作は冪等キーまたはdurable receiptで重複副作用を防ぐ。

### NFR-2: Performance

- #1667以外のBoltは既存テストのtimeout値、serial/parallel分類、固定待機時間を変更しない。
- 固定sleepの延長をflaky対策に使用しない。
- #1667のtimeout変更が必要な場合、並列coverage実測と内外budgetの整合を根拠にする。

### NFR-3: Security and authorization

- agent role、intent UUID、stage、gate responseのprovenanceをparse-don't-validateで扱う。
- identity不明、carrier欠損、reservation不一致はfail-closedとする。
- ログへtoken、環境変数値、private pathの内容を出さない。

### NFR-4: Portability

- Bun 1.3.13を基準とし、macOSとLinux CIで検証する。
- process生存、symlink、filesystem rename、PID command lineのOS差を前提に、単一OSだけの未文書挙動へ依存しない。
- Windows固有実装は対象外だが、path文字列をPOSIX固定で新規ハードコードしない。

### NFR-5: Maintainability

- 単発の抽象化や汎用framework追加を避け、Issueの根因へ最小変更を行う。
- 既存のdomain型、transaction、receipt、hook adapter境界を再利用する。
- 変更したpublic/internal contractには型検査と回帰テストを対応付ける。

### NFR-6: Testability

- 各Boltは修正前Redと修正後Greenを同一テストまたは同一制御fixtureで示す。
- `bun run typecheck`、`bun run lint`、対象テストを必須とする。
- coreまたはharness投影を変更するBoltは`bun scripts/package.ts --check`と`bun run promote:self:check`を必須とする。
- 統合後に`bun run test:ci`を実行し、既知のcold-compile timeoutは対象ファイルを`bun test --timeout 120000 <file>`で再検証する。

## Constraints

- Bun-only TypeScript monorepoであり、常駐serviceやdatabaseを新設しない。
- `dist/`およびpromoted self-install面を手編集しない。
- 既存のGitHub Issue 7件以外を同じBoltへ便乗させない。
- 2026-07-29T07:52:34Z以降に新たなopen bugが増えても、本要件へ自動追加しない。追加はユーザーの明示的なchange requestで行う。
- #1336→#1663、#1607→#1680の依存順序を守る。
- 進行中のOTel Intent #1679は、#1607、#1664、#1680が完了するまでConstructionへ進めない。#1664はBatch 1で#1607と並行し、OTel Journal v2変更前に診断契約と根因修正を着地させる。

## Assumptions

- GitHub Issue本文と2件のクロスレビューが存在するIssueでは、その確認済み事実を再調査の出発点として利用できる。
- #1664・#1663・#1667の最終根因は未確定であり、Issue本文の仮説を実装仕様として固定しない。
- #1680はReverse Engineering後に追加されたため、Construction開始時にKimi hook、core Stop hook、permission生成、presence guardの現行配置を再確認する。
- GitHub Actionsの#1662経路はclean checkoutであり、現時点では直接影響を受けない。
- OTel Intentの実装変更は未着地であり、共有ファイルの競合はmirrorとworktreeの最新状態を各Bolt開始前に再確認する。

## Out of Scope

- OTel API統合機能そのもの、Phase 1 walking skeleton、可観測性製品要件
- 7件以外のopen issue、既にclosedの隣接Issue、一般的なCI高速化
- `team-up.sh`全体の再設計、process supervisor frameworkの新設
- patch coverage方式そのものの置換やallowlist全面廃止
- Kimi以外のharnessに存在しないStop-hook identity機構の新規統一。ただしcore authorization変更による既存harness回帰は検証する
- GitHub本番Issueを使った破壊的なcompletion retry試験。外部mutationは隔離fixtureまたは専用test repositoryで検証する

## 実行順序と並行化

共有ファイル競合を避けつつ最大限並行化する。

| Batch | 並行可能なBolt | 終了条件 |
|---|---|---|
| 1 | #1607、#1336、#1662、#1667、#1664 | 各Boltが個別にRed→Green、関連suite、必須drift guardを完了。#1664はOTel Journal v2変更前に着地 |
| 2 | #1680（#1607後）、#1663（#1336後） | 先行Boltを取り込み、共有ファイル競合がないbaseから開始。OTel Constructionは#1607・#1664・#1680完了後に解禁 |

利用可能なworker枠がBatch数より少ない場合はwaveへ分割する。wave分割は依存関係を変えず、完了したBoltのbase取り込み後に次waveを開始する。

## 受け入れトレーサビリティ

| Issue | 必須証拠 | 主な回帰面 |
|---|---|---|
| #1662 | dirty sourceで事前非0、actionable stderr、clean時互換 | `tests/coverage-patch-gate.ts`関連unit/integration |
| #1667 | 制御遅延またはcleanup競合のRed、timeout budget整合、並列coverage Green | `tests/integration/book-pack-verify.test.ts`、coverage `-P 4` |
| #1664 | status 1時の診断、決定的根因fixture、stable clone-id | `t224-upstream-v2-migration-cli.test.ts` |
| #1336 | ready前exit 9の決定的Red、全role rollback、全ready後成功 | team-up Codex resume / safety-wait関連test |
| #1663 | delayed memberの決定的Red、member単位診断、registration直列性 | `t295-team-up-worktree-parallel.test.ts` |
| #1607 | multi-intent最終reportからmirror chain・seal・cursor clear、各crash point retry | completion / mirror / audit integration |
| #1680 | subagent Stop no-op、mutation拒否、gate response reservation、main conductor互換 | Kimi adapter / Stop hook / reviewer gate integration |

## Open Questions

要件生成時点で未回答のユーザー判断はない。次の技術的不確実性は各BoltのEvidence-first Redで解消する。

- #1667の直接原因がtimeout budget、cleanup競合、並列resource contentionのどれか
- #1664のstatus 1がproduct、fixture、process起動のどこから発生するか
- #1663のmember未完了がcheckout、record生成、registration観測のどこから発生するか
- #1680のKimi agent identityをhook payload、環境、permission carrierのどこで最も狭く検証できるか

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-29T07:58:15Z
- **Iteration:** 1
- **Scope decision:** none

7件の分離と主要な受け入れ面は明確だが、#1680の根拠、#1662のdirty境界、OTel依存順序に着手前解消が必要な欠落がある。

### Findings

- Major: #1680は質問票で追加だけが裁定され、詳細FR・受け入れ条件の正本とするIssue本文が許可された上流入力に含まれないため、FR-1680-1〜4がユーザー要求へ追跡可能か検証できない。対象: amadeus/spaces/default/intents/260729-open-bug-batch/inception/requirements-analysis/requirements.md, amadeus/spaces/default/intents/260729-open-bug-batch/inception/requirements-analysis/requirements-analysis-questions.md, amadeus/spaces/default/codekb/amadeus/business-overview.md, amadeus/spaces/default/codekb/amadeus/architecture.md, amadeus/spaces/default/codekb/amadeus/code-structure.md
- Major: #1662はユーザー裁定がdirty worktree全体のfail-fastである一方、FR-1662-1はtracked変更だけを対象にしており、coverageへ影響するuntracked sourceを拒否するか未定義なためsnapshot不一致が残り得る。対象: amadeus/spaces/default/intents/260729-open-bug-batch/inception/requirements-analysis/requirements.md, amadeus/spaces/default/intents/260729-open-bug-batch/inception/requirements-analysis/requirements-analysis-questions.md
- Major: 上流は#1664をOTel #1679 Construction前の依存としているが、要件の制約とBatch表は#1607→#1680だけをOTel前提としており、#1664を先行させるかが矛盾している。対象: amadeus/spaces/default/intents/260729-open-bug-batch/inception/requirements-analysis/requirements.md, amadeus/spaces/default/codekb/amadeus/business-overview.md, amadeus/spaces/default/codekb/amadeus/architecture.md
- Minor: 「成功時ログ量を過度に増やさない」「既存suite時間を意図的に延長しない」は基準値・許容差・測定条件がなく、QAが客観的な合否判定を作れない。対象: amadeus/spaces/default/intents/260729-open-bug-batch/inception/requirements-analysis/requirements.md

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-29T08:00:58Z
- **Iteration:** 2
- **Scope decision:** none

前回4指摘は解消したが、#1607のcomplete後append可否が上流境界および同一要件内で矛盾しているため未着手判定にはできない。

### Findings

- Major: FR-1607-3は限定的なcomplete後専用appendを許容しているが、上流architectureはmirrorを完了後の特例として書く案を明示的に不採用とし、FR-1607-2・4もmirror証拠の耐久化後にworkflow complete・audit sealを行う順序を要求しているため、開発者とQAがcomplete後appendを実装・許容・拒否のどれにすべきか決定できない。対象: amadeus/spaces/default/intents/260729-open-bug-batch/inception/requirements-analysis/requirements.md, amadeus/spaces/default/codekb/amadeus/architecture.md

## Review Finding Resolutions

- Iteration 1の4件は、#1680 Issue要求の質問票内正本化、#1662の全非ignore dirty変更拒否、#1664のOTel Construction前着地、成功時ログとtimeout変更禁止の客観化で解消した。
- Iteration 2のMajorはFR-1607-3を改訂して解消した。completion関連auditはregistry complete前の同一transaction内で耐久化し、mirror chain確定後にregistry completeとaudit sealを適用する。complete後専用appendは設けず、`ARTIFACT_UPDATED`も再許可しない。
