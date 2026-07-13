# Claude Native Driver Reliability Design

## 入力契約とreliability boundary

本設計は`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を消費する。信頼性はAgent Teams/Ultraのfalse native success、wrong-session adoption、片系evidence success、post-dispatch fallback、機密漏えいを各0件にすることで定義する。Claude service uptime、backup、multi-region、model latencyは非適用である。

## Reliability patterns

| Pattern | Component | Invariant |
|---|---|---|
| resolve-scope probe | `ClaudeResolveScope` | common 1回、mode各最大1、resume fresh |
| bounded identity reservation | `ClaudeSessionPrefixAllocator` |既存team/taskを採用せず256で停止 |
| capture-before-arm | `EvidenceCapturePlan` + U-02 supervisor | capture identity checkpoint前のprovider arm 0 |
| terminal-before-join | U-02 supervisor | group terminal前のfinal snapshot確定0 |
| independent-source AND | mode evidence correlator | provider-stateまたはstream/hook片系success 0 |
| closed surface profile | profile guard | unknown version/event/pathを推測0 |
| Unit-child bijection | mode correlator + C-08 | missing/extra/duplicate success 0 |
| referee-authoritative completion | conductor + C-11/C-01 two-phase ports | native evidence単独のbatch success 0 |

## Mode-specific success conditions

Agent Teams successは、exact session、coordinator exit 0、provider-stateの2 member以上と全Unit task/member全単射、stream/hookの全task created/completedと全owner idle、両sourceのtask ID/token/name一致、Teams marker、C-08 correlationのANDである。

Ultra successは、`--effort ultracode`、profile-bound mode marker、実run exactly 1、2 worker以上と全Unit task/agent全単射、同一run/sessionのworkflow markerと全agent start/stop、全status completed、background workflow 0、C-08 correlationのANDである。xhigh、通常Agent tool、floor、prompt/assistant自己申告は一項も代替しない。

## Failure, cleanup, and recovery

| Failure | Timing | Result | Recovery |
|---|---|---|---|
| CLI/auth/mode/capture unavailable | pre-dispatch | explicit unavailable | input/environment修正後fresh probe |
| prefix collision/枯渇 | pre-dispatch | provider 0 | fresh attempt/candidate |
| team/member/task不一致 | post-dispatch | evidence failure | failed-resumable、fallbackなし |
| Ultra run/path/profile unknown | discovery/preflight | park | profile確定まで同名native不可 |
| unknown event/child不足・余分 | post-dispatch | evidence failure | fresh session/run |
| observer stop/join/snapshot failure | post-dispatch | success 0、scratch隔離 | U-02 recovery後fresh capture |
| coordinator crash/timeout | dispatch | exact group回収 | fresh probe/session/capture |
| C-08 green、C-11 red | referee | batch success 0 | authoritative verdictどおり |

normal exitではprovider group terminal後にcaptureをstopAndWaitし、last valid atomic snapshot、hook set、terminal streamを確定してからnormalizeする。C-08 verdict後にephemeral settings/hook/state scratchを削除し、normalized evidenceだけを残す。cleanup failureは成功にせずattempt dirをredacted診断付きで隔離する。

resumeはfresh resolve scope、UUID/session、prefix reservation、evidence dir、surface binding、probeを必須にする。旧team config、persistent task、workflow run、snapshot、probe result、自己申告をnative evidenceへ再利用しない。

## Observability and verification gate

診断/live evidence indexはdriver/mode、CLI/profile version、closed failure code、unknown event count、execution/attempt/run/path digest、expected/observed child count、source/marker、check/finalize verdictだけを持つ。prompt、script、description、message、assistant result、transcript、生path、credentialを持たない。

- deterministic fake suiteでprobe、launch、prefix、capture、両mode evidence、機密性、compatibility、lifecycle、C-01↔C-11 direct edge 0を検証する。
- macOS opt-in live proofで各mode 2 Unit以上、production registry、実state+stream、C-11/C-01二相gateをgreenにする。
- GitHub Actions Linuxはcredential不要fake suiteを必須にし、macOS live passへ偽装しない。Windowsは対象外とする。
- capture-before-arm、terminal-before-join、wrong path/session、片系evidence、unknown schema、post-dispatch fallback、secret canaryの失敗またはskipをmerge blockerにする。
