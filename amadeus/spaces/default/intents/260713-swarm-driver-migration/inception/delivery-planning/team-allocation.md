# Swarm Driver Migration Team Allocation

## Allocation前提

`team-formation`はscopeでSKIPされているため、永続mobや新しいteamを編成しない。全Boltの実装leadは既定どおり`amadeus-developer-agent`とする。Delivery Planningのdirectiveに従い、`amadeus-delivery-agent`がsequencing／risk gateを管理し、`amadeus-architect-agent`がcontract／runtime seamとnative evidence境界を独立レビューする。

Requirements Analysisの`requirements`、Application Designの`components`、Units Generationの`unit-of-work`／`unit-of-work-dependency`／`unit-of-work-story-map`、Practices Discoveryの`team-practices`をallocation根拠とする。`stories`と`mockups`はSKIP済みで、追加のproduct/design担当は不要である。

## Bolt Allocation

| Bolt | Unit | Lead | Mandatory support / review | Human responsibility | Mob |
|---|---|---|---|---|---|
| B-01 | U-01 Contract & Selector | `amadeus-developer-agent` | Architect: closed contract、ownership、I/O-free境界 | checkpoint PRの承認・merge | 常設なし |
| B-02 | U-02 Lifecycle | `amadeus-developer-agent` | Architect: state machine、closed transport/capture、registry assembly、referee／audit境界 | 仕様変更・false-success例外の判断 | 常設なし |
| B-03 | U-04 Codex | `amadeus-developer-agent` | Architect: Ultra handshake、JSONL／hook独立source、production path | macOS credentialed run、主要前提失敗時のscope判断 | 常設なし |
| B-04 | U-03 Claude | `amadeus-developer-agent` | Architect: PTY Agent Teams／headless Ultra Code marker、通常async Agent／Task floorとの区別、U-02非改変 | macOS credentialed run、外部surface blockの判断 | 常設なし |
| B-05 | U-05 Kiro | `amadeus-developer-agent` | Architect: trust、session全単射、balanced wave | macOS credentialed run、外部surface blockの判断 | 常設なし |
| B-06 | U-06 Release Closure | `amadeus-developer-agent` | Architect: closed registry／distribution invariant | PR merge、GitHub Issue起票内容の確認 | 常設なし |

## Program Board

| Wave | Ready条件 | Active Bolt(s) | Completion gate |
|---|---|---|---|
| Checkpoint | Delivery Planning承認、最初のpre-code design完了 | pre-code checkpoint PR | 人間承認・`main`へmerge。実装差分0件 |
| F-1 | checkpoint merge済み | B-01 | contract review、deterministic fixture、squash merge |
| F-2 | B-01 contract確定 | B-02 | runtime、closed transport/capture、failure injection、squash merge |
| Stack同期 | B-02共通seamがreview済み | [PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)のU-03 branchを[PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)の更新headへrebase | U-03差分にcommon runtime変更0件、CI green |
| N-1 | B-02 merge済み、Codex schema discovery PASS | B-03 | macOS Codex live proof。失敗時はintent再審議 |
| P-1 | B-03 merge済み | B-04、B-05 | 実装／fake suiteは並列。live proofはmutexで直列 |
| R-1 | B-04/B-05 merge済み | B-06 | registry／distribution／docs／platform matrix closure |

P-1はengine上のparallel batchになり得るが、永続的なUnit親ではない。B-04/B-05は別worktree、別branch、別PR、別squash commitを維持する。両者のlive proofが同時readyならB-04 Claudeを先にし、B-05 Kiroがmutexを引き継ぐ。

## Decision Rights

| 判断 | Responsible | Escalation |
|---|---|---|
| 承認済みcontractに沿う実装方法 | Developer lead、Architect review | 要求・user-visible contract変更ならユーザーへ |
| Bolt readinessと依存順 | Delivery agent | DAG変更が必要ならUnits Generationへ戻す |
| Native evidenceの機械判定 | Developer lead、Architect independent review | Codex主要前提失敗はintent全体、Claude/Kiro失敗は該当Boltをpark |
| Credentialed live run | User-authorized local environment | credential／trust不足をskip-as-passにしない |
| PR merge | User | AIはmerge判断を代行しない |
| Windows対応 | Out of scope | 既存Windows経路変更が必要ならscope gateへ戻す |

## Review Independence

Architectはbuilderと同じ自己申告を根拠にせず、公開conductor → C-01 → production registry → native coordinator → evidence verifier → refereeの経路と、providerごとの独立sourceを確認する。U-02単体test以外でtest-injected registryをprovider proofに使った場合はREVISEとする。

常設mobは置かない。schema discoveryが説明不能、同じblocking failureが反復、contract ownershipが複数Unitへ跨る、またはreviewでfalse-success経路が見つかった場合だけ、developer／architect／deliveryをblocker mobとして招集する。mobは決定権を拡張せず、仕様変更とPR mergeはユーザーへエスカレーションする。

## Branch and Merge Policy

最終merge targetは`main`とし、取り込みはBoltごとのsquash mergeとする。依存中のstacked PRは一時的に直前Bolt branchをbaseにする。現在はB-01の[PR #960](https://github.com/amadeus-dlc/amadeus/pull/960)を`main`上、B-02の[PR #964](https://github.com/amadeus-dlc/amadeus/pull/964)をB-01上、B-04の[PR #965](https://github.com/amadeus-dlc/amadeus/pull/965)をB-02上に積む。先行PR merge後は後続PRを`main`へretarget/rebaseし、Boltごとのdiffを維持する。`amadeus/` recordはcheckpointでversion controlし、実装PRへ無関係な工程記録や別Bolt差分を混在させない。
