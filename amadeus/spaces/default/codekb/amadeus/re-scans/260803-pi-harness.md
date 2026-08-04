# RE差分リフレッシュ記録 — 260803-pi-harness

## Scan Metadata

- Date: `2026-08-03T08:12:00Z`
- Base commit: `a8e1ce025a918310ab7d803270bb6fc6b649c598`
- Observed commit: `498c3034a78bd432dc426f9f807b79c8ae980762`
- Ancestry: baseはobservedの祖先
- Distance: `42 commits`
- Diff: `1584 files changed, 171746 insertions(+), 6216 deletions(-)`
- Scope: `self-feature`、Brownfield、単一repo `amadeus`、Standard depth、Comprehensive test strategy
- Focus: Pi Coding Agent正式ハーネス。Agent Core単体SDKを除外し、setup CLI + Pi Package local/git、全subagent経路、TUI dogfood、print/RPC live journeyを含む

diff規模の大部分はgenerated dist、self-install、plugin projection、metrics/recordであり、authored sourceのarchitecture changeと区別した。

## Scan Mode

Developer Agentがread-only differential scanを実施し、harness、core、setup、packaging、test、documentation seamを抽出した。Architect Agentへの委譲は旧CodeKBを削除後に書き戻しを完遂しなかったためconductorが中断し、Developer scanとlive HEAD証拠を使って10成果物をlast-writer-wins current snapshotとして合成した。source code、generated dist、testは変更・実行していない。

## Current Findings

1. Pi harness authored sourceは未存在。一次実装先は`packages/framework/harness/pi/`
2. skillとBun engineはPi 0.83.0で部分動作するが、native lifecycle/gate/doctor/subagent/distribution contractは未実装
3. harness追加点はmanifest自動発見だけでなく、projection、runtime identity、swarm、setup、plugin/self-install registryへ分散する
4. `stageEntry`、共通hook、fixed-width pool、packaging candidate/parity等の再利用可能なseamがある
5. Pi Packageとcustom question/subagent exampleは実装足場になるが、Amadeusのaudit、persona、failure contractへの適合が必要
6. root packageはprivateであり、Pi Packageは`dist/pi` projectionまたは専用workspace packageとして設計する必要がある

## Requirements Analysisへの申し送り

- Pi lifecycle eventごとの入力、正規化結果、idempotency、failure behaviorをtestable requirementにする
- HUMAN_TURNはユーザー回答1件につき正確に1回。回答なしのgate advanceを禁止する
- `agent_settled`をengine continuation境界とする妥当性をlive captureで確認する
- support/reviewerとConstruction swarmに共通のrole、parent-child、timeout、failure propagation要件を定義する
- setupとPi Packageのsingle-source parity、fresh/update/idempotent、project trust、user file preservationを要件化する
- doctorのPi 0.83.0 floor、binary/resource/extension/driver診断とCodex誤検出防止を要件化する
- registry registration漏れを検出するmachine parity requirementを追加する
- live journeyは`AMADEUS_PI_*_LIVE` opt-in、binary/provider/authの明示skip reasonを持つ

## Verification Notes

実装前の本scanではsource変更とtest実行を行っていない。後続設計はfile pathとsymbolを使い、行番号を固定しない。Pi APIの詳細はlocal 0.83.0型定義とlive fixtureで再確認する。
