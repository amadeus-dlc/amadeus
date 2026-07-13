# Functional Design 質問 — Codex Native Driver

## 判定

追加のユーザー質問はない。`unit-of-work.md`と`unit-of-work-story-map.md`はU-04をrisk gateとし、batchあたり1つのcoordinator、2 Unit以上へのnative委譲、xhigh／Unit別`codex exec` floorとの差別化を確定している。`requirements.md`はFR-13、FR-15、FR-19、FR-23を通じてUltra、既存referee、機密性、macOS live proofを必須にしている。`components.md`、`component-methods.md`、`services.md`はC-06、3 source evidence、attempt lifecycleを固定している。

以下はproduct判断ではなく、2026-07-13時点のOpenAI公式surfaceとlocal `codex-cli 0.144.0`を上流契約へ写像するarchitect判断である。公式文書はUltraをsubagentによる並列委譲として説明し、`model_reasoning_effort="ultra"`を対応model向けのreasoning effortとして公開している。local app-serverの`model/list`は`gpt-5.6-sol`の`supportedReasoningEfforts`に`ultra`を含め、その説明をautomatic task delegationとして返した。`config/read`もinvocation override後に`model=gpt-5.6-sol`、`model_reasoning_effort=ultra`を返した。credentialed model turnはこの設計段階では実行せず、Code Generation entryのlive discovery gateで確認する。

## 上流で確定済みの設計確認

### Q1. model slugをhard-codeせず、Ultra対応modelをどう解決するか

[Answer]: 短命な`codex app-server`へ`config/read`、`model/list`、`account/read`を送り、effective model request、catalog capability、認証種別だけをallowlist projectionする。probe開始時はresolve scope、nonce、CLI version、project identity、要求overrideだけをpre-seed入力として固定する。同じapp-server connectionからconfig、hook definition、catalog snapshotを得た後に、provider/requested modelを含む`ProbeBindingV1.pending`のseedを一度だけsealする。設定値がaliasまたは省略の場合、behavior handshakeは`--model`を付けず同じlayer/overrideとseed/nonceで起動し、`SessionStart.model`でexact resolved modelを得る。そのIDをseed済みcatalogへexact matchして`ProbeBindingV1.bound`のfinal digestを生成し、本runだけを`--model <exact-id>`へpinする。特定slugは実装定数にせず、mode identifierだけを`codex-ultra-v1:<resolved-model-id>`とする。

### Q2. Codex Ultraをxhighや通常multi-agentからどう区別するか

[Answer]: Ultraは単一markerではなく次のANDである。(1) app-server catalogがresolved modelについて`ultra`を列挙する、(2)同じinvocation overrideのeffective configが`model_reasoning_effort=ultra`である、(3)`features.multi_agent=true`を明示する、(4)batch 1件の`codex exec --json` parentからUnit数と同数かつ2件以上のsubagentが実際にstart/stopする、(5)全Unitとchildが全単射である。`xhigh`、plan update、coordinator message、thread 1件だけでは成立しない。

### Q3. model、parent thread、childをどの公開fieldで相関するか

[Answer]: JSONLの`thread.started.thread_id`をparent IDとし、hook共通fieldの`session_id`と一致させる。`SessionStart`の`model`をresolved model証跡へ使う。`SubagentStart`／`SubagentStop`の`session_id`、`turn_id`、`agent_id`、`agent_type`だけをcaptureする。Codex公式仕様上、subagent hookの`session_id`はparent session IDである。`agent_transcript_path`、`last_assistant_message`、prompt、tool outputは読まず、保存しない。

### Q4. hookの`agent_type`からUnit割当をどう証明するか

[Answer]: 各Unitに非機密のassignment tokenを導出し、`agent_type=amadeus_u_<token>`というattempt固有roleを1つ割り当てる。roleは公式の`agents.<name>.config_file`と`agents.<name>.description`をsession overrideで登録し、全roleがframework同梱のgeneric worker configを共有する。generic configはmodel／reasoning effortをpinせずparentのUltra設定を継承する。stdin manifestがUnit、role、worktreeを1対1で指定し、hookのroleとexpected mapがUnit-child bindingを確定する。Unit slugやworktree pathをrole fileへ永続化しない。

### Q5. hook trustとattempt限定captureをどう両立するか

[Answer]: projectの既存`hooks.json`へ`SubagentStart`を追加し、既存`SessionStart`と`SubagentStop`のadapter commandをattempt evidence modeへ拡張する。`--dangerously-bypass-hook-trust`は使わない。U-02がprovider arm前にcapture ID、attempt lease/fencing由来owner token、nonce hash、binding digest、sandbox外evidence rootを固定し、C-06の`LaunchSpec.env`へ5つのexact correlation keyとして渡す。static hook commandはprovider envを継承する一方、model-generated tool/subagent shellは`shell_environment_policy.inherit="none"`とsafe scratch HOME/PATHだけへ限定し、correlation key、auth env、実HOMEを継承しない。evidence rootはcwd/全`--add-dir`/sandbox tempの外に置く。`hooks/list`のversioned trust profile、SessionStart sentinel、悪意あるtoolからのenv read/evidence write拒否を実証できない構成はpre-dispatch unavailableとする。

### Q6. process、stdin、config overrideをどう構築するか

[Answer]: batchごとに`codex exec --json --ephemeral`を1 processだけ起動する。`--model <resolved-model-id>`、`-c model_reasoning_effort="ultra"`、`--enable multi_agent`をargv配列として渡し、存在しない`--ultra` flagを作らない。approval／sandboxは既存harness policyに従い、各referee worktreeを`--add-dir`で明示する。manifestとcoordinator instructionはstdinへ1回だけwriteしてEOFを送り、promptをargv、一時config、auditへ置かない。

### Q7. model catalogの静的対応だけでnative successにしてよいか

[Answer]: しない。catalogとeffective configはdispatch前capability proofであり、実行時には同じresolved modelを報告する`SessionStart`、JSONL parent thread、expected roleのSubagentStart/Stopに加え、公式`collabToolCall`意味（0.144 generated schemaでは`collabAgentToolCall`）へcredentialed profileで写像したterminal itemの`senderThreadId`、`receiverThreadIds`、`status=completed`、`agentsStates[child].status=completed`を要求する。SubagentStopだけからsuccessを推定せず、hook agent IDとcollaboration child thread IDをexact matchする。C-08はnative child lifecycleだけを判定し、worktree成果・protected spec・収束は後続C-11だけが判定する。Code Generation entryのcredentialed fixtureでJSONL投影とhook IDを相関できなければU-04をparkし、floorやxhighを同名成功へ読み替えない。

### Q8. resume時にCodex sessionを再利用するか

[Answer]: 再利用しない。U-02が旧process groupとcapture joinを確定した後、同じexecution IDに新attempt ID／nonce／role token／evidence directoryを発行し、app-server capability probeから再開する。旧thread、child ID、hook fileを新attemptへ持ち越さず、refereeが確定済みのUnit convergence結果だけを既存契約どおり再利用する。

## 曖昧性分析

- 曖昧な回答: なし。Ultraはcatalog capability、effective config、実subagent delegationのANDとして閉じた。
- 回答間の矛盾: なし。model slugをhard-codeしない方針と、利用者環境で`gpt-5.6-sol`を実際に解決して検証する方針は両立する。
- 成果物生成を止める不足情報: なし。credentialed hook handshakeだけはCode Generation entry gateであり、失敗時のpark／scope returnまで定義済みである。
