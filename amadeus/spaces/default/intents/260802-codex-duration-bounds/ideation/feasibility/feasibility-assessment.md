# Feasibility Assessment — 長時間実行の統一的な有界化

## Executive Conclusion

判定は **条件付き GO** とする。

対象4 Issue は、Codex 専用の安全ゲートを新設せず、共有 core の単一 conformance 契約と harness 別 adapter／live probe に分ければ実現可能である。Codex は長時間化を強く観測した一次性能評価対象だが、停止性、反復予算、並列上限、終了理由は全 supported harness に適用する共有不変条件である。

進行条件は次の5点である。

1. #1602 で由来情報の共有 schema、取得不能表現、Codex 一次 workload のベースラインを先に確定する。
2. 合否 predicate は共有 core を唯一の正本とし、非遷移イベントで累積予算を巻き戻せないことを決定的に検証する。
3. 影響を受ける harness は adapter capability と conformance 証拠を提出し、取得不能を無証拠の成功へ丸めない。
4. package／self-install／promote の投影差分を blocking 検証し、live journey は同じ契約を実証する補助層として扱う。
5. 各 Bolt の上限値と性能目標は #1602 の実測後に NFR として確定し、現時点で根拠のない値を固定しない。

## Upstream Inputs

- `intent-statement`: `ideation/intent-capture/intent-statement.md` を正本とし、問題、対象者、成功指標、4 Issue の依存順を参照した。
- `competitive-analysis`: Market Research が SKIP のため存在しない。競合比較を推測で補完していない。
- `market-trends`: Market Research が SKIP のため存在しない。市場動向を実現可能性の根拠にしていない。
- `build-vs-buy`: Market Research が SKIP のため存在しない。外部製品の導入判断は本 Intent の対象外である。

## Requirement Boundary Assessment

| Concern | Requirement owner | Harness-specific evidence | Feasibility judgement |
|---|---|---|---|
| 実行由来情報 | 共有 schema と欠損意味論 | native payload から取得できる値 | 実現可能 |
| 停止予算 | 単調な共有 budget predicate | hook／lifecycle からの入力写像 | 実現可能、回避再現を必須化 |
| 質問・レビュー予算 | 共有反復契約と終了理由 | 質問レンダリング／review driver | 実現可能 |
| swarm 上限 | 共有同時実行・再試行契約 | harness の worker driver | 実現可能、現行 counter 不足を要修正 |
| 配布整合 | package／promote の drift 契約 | harness 投影と self-install | 既存検査へ接続可能 |
| 性能改善 | 共通の測定 schema | Codex 一次 workload、他 harness は任意の比較 cohort | 実現可能、同率改善は要求外 |

この分割により、harness 固有差は「同じ規則へ何を入力できるか」という adapter capability になり、別の安全ポリシーにはならない。Codex 専用 blocking gate は、Codex 固有の native lifecycle／hook 意味論が共有 predicate へ写像不能で、共通検査では欠陥を検出できないという再現可能な証拠が得られた場合だけ再検討する。現時点でその証拠はない。

## Technical Viability

### 実行由来情報とベースライン

[Issue #1602](https://github.com/amadeus-dlc/amadeus/issues/1602) は、Codex と Claude Code を含む harness 差を取得値または取得不能として扱う前提を持つ。したがって、Codex 専用 telemetry ではなく、共有 schema と capability を分離する方向が Issue の成立範囲と整合する。state・audit・runtime graph は既に相関可能な記録面として存在し、新たな常駐サービスを必要としない。

### 停止性

[Issue #1998](https://github.com/amadeus-dlc/amadeus/issues/1998) は固定 SHA `d72f60b5a81fc6e45f99431d61b6561e91b2fc37` で `ESTABLISHED_WITH_REFINEMENTS` が成立している。現行 Stop hook の進捗シグネチャが current stage と audit shard 行数を含むため、stage 遷移を伴わない監査追記でも連続回数がリセットされ得ることが確認されている。

[takt 比較コメント](https://github.com/amadeus-dlc/amadeus/issues/1998#issuecomment-5154591557)の二層モデルは実現可能性を補強する。決定的な累積上限を停止性の主契約とし、所見減少などの意味論的収束判定を再計画の補助情報に限定すれば、LLM 判断だけに安全性を依存しない。

### 質問・レビュー予算

[Issue #1999](https://github.com/amadeus-dlc/amadeus/issues/1999) の対象は reviewer／worker の共有契約であり、harness ごとに異なる質問 UI を同一にすることではない。反復回数、消費予算、終了理由を共有語彙にし、レンダリングや native driver を adapter に残す分離は成立する。

### 有界 swarm

[Issue #1919](https://github.com/amadeus-dlc/amadeus/issues/1919) の unit pool は core engine の実行制御である。現行 swarm は `cap-exhausted` という終了理由を持つ一方、同一 Unit の再試行を数えるハード counter を所有しない。共有 pool／counter を正本にし、各 harness driver が許可された枠だけを消費する形は実現可能である。

## Verification Feasibility

検証は三層で構成できる。

| Layer | Blocking responsibility | Evidence |
|---|---|---|
| Shared core conformance | 予算の単調性、上限、終了理由、schema | counter assertion、境界値、回避再現、状態遷移テスト |
| Harness adapter conformance | capability 写像、取得不能表現、投影整合 | 各 harness の package／self-install テスト、drift check |
| Live journey | 実モデルと native lifecycle の結線 | harness ごとの opt-in journey、Codex 一次 dogfood |

長い実時間 timeout を検証で再現する必要はない。短縮可能な timing seam、counter assertion、上限の境界値で主契約を決定的に確認し、live journey は結線確認に限定できる。これにより、長時間化を直す検証自体が無制限に長くなる自己矛盾を避けられる。

## AWS Platform Perspective

本変更は Bun で短時間実行される TypeScript CLI とローカル／GitHub の記録境界を対象とし、AWS account、常駐 workload、VPC、データストア、IaC の新設を必要としない。AWS Well-Architected のサービス選定やスケーリング要件は **N/A** である。

ただし、一般原則としての operational excellence と reliability は、状態の可観測性、上限の明示、失敗理由の記録、決定的な回帰検査として適用する。クラウド資源を導入して解決する理由はない。

## Compliance Perspective

新しい PII、PHI、決済情報、データ residency 対象を扱わないため、PCI-DSS、HIPAA、GDPR 固有の追加統制は **N/A** である。主要な統制対象は内部 operational metadata である。

- telemetry は stage／agent／tool／harness／model／version／duration／termination reason に限定し、prompt 本文、secret、credential を収集しない。
- 取得不能値を推測で補完せず、欠損の理由を capability として記録する。
- audit と runtime graph の相関を保ち、終了理由や予算消費の証拠を後から検証できるようにする。
- live journey のログは repository の既存 secret redaction と保持方針を越えて拡張しない。

## Delivery Feasibility

`#1602 → #1998 → #1999 → #1919` の順序は成立する。#1602 が比較 schema とベースラインを提供し、後続3 Bolt が同じ workload と終了理由で改善効果を測れるためである。1 Issue = 1 Bolt、各 Bolt 着地後の後続 rebase、package／promote 後の park と fresh-session resume は、前段改善を後段作業そのものへ波及させる合理的な境界である。

各 Issue の `in-progress` は実着手時だけ付与し、現在は #1602 のみを着手中とする。実装前には Reverse Engineering で各契約の正本と harness 投影範囲を確定し、Issue 記述だけから所有境界を断定しない。

## Feasibility Conditions and Exit Criteria

次を満たせば Feasibility の懸念は後続ステージで管理可能である。

1. Scope Definition が「共有の正しさ」と「Codex 一次性能評価」を別の成果条件として記載する。
2. Requirements Analysis が、取得不能 semantics、単調 budget、共有 termination reason、adapter capability、分布 drift を検証可能な要件へ落とす。
3. Reverse Engineering が、core／harness／生成物の実際の所有境界と既存テスト seam を一次ソースで確定する。
4. NFR Requirements が、#1602 のベースライン後に具体的な時間・反復・並列上限を決定する。
5. Build and Test が、決定的 conformance を blocking、live journey を capability 条件付きの結線証拠として分離する。

以上を条件に、本 Intent は技術的・運用的・コンプライアンス上、実行可能である。
