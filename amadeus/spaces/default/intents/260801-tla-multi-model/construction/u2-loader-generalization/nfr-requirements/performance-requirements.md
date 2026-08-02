# Performance Requirements — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): business-logic-model(§1.1 単一読込原則, §3 戻り型), business-rules(BR-V5, BR-V6, BR-S2), requirements(NFR-1 / NFR-2, FR-2 / FR-4)

本 Unit は内部 CLI 検証ツール(specs/tla 内の小規模テキスト資産を読む loader)の改訂であり、応答時間・スループット目標を定量的に設定する対象のサービスではない。適用可能な性能要求は「検証の計算量と読込回数の構造的拘束」として以下に固定する。

## 適用要求

| # | 要求 | 測定可能な基準 | 由来 |
|---|---|---|---|
| PR-U2-1 | 各資産(model/cfg/aux)のファイル読込と canonical identity 計算はモデルごとに**各1回**とし、照合・宣言解決・戻り値構築で同一読込結果を流用する(単一読込原則)。二重読込・照合 bytes と解決ソースの取り違えが起き得る構造を禁止する | t403 / 統合テストで注入 fs の readAsset 呼出回数が資産数と一致すること(または code review で単一経路を確認) | BR-V5, business-logic-model §1.1/§2.1 |
| PR-U2-2 | loader 検証の計算量は登録モデル数 n・モデルあたり資産数 m・宣言解決の推移閉包サイズに対して**線形**(O(n×m + 推移閉包))。指数関数的な再帰・全ペア比較を持ち込まない | MirrorLifecycle + FormalElection の2モデル構成で既存の単体/統合テストの実行時間が改訂前と同オーダー(大幅な悪化があれば原因調査) | BR-D4(u1 単一実装共有), u1 リゾルバの線形境界 |
| PR-U2-3 | 検証順序は fail-fast 直列((1) map parse → (2) identity 照合 → (3) 宣言照合 → (4) entries 照合)とし、最初の失敗で打ち切る。失敗後に残資産を読み続ける無駄な I/O を行わない | t403 の赤ケース群が fail-fast 順序(BR-V6)どおりのエラー種で打ち切られること | BR-V6 |
| PR-U2-4 | u5 の CI 全モデル逐次実行(30 分 timeout 内、実測方針 FE Q1=A)の前提として、loader 側の全モデル化が探索時間に**寄与しない**こと — loader は TLC 探索の外側で ms〜秒級の検証のみを行う | 本 Unit の責務は loader のみで TLC 実行時間は u5 の測定対象。loader 改訂による CI ジョブ時間増分は無視できる程度(既存テスト wall-clock で代替確認) | requirements FR-5, NFR-1 |

## 非適用の判断

レスポンスタイム目標(p99 等)・スループット目標・リソース利用率上限の設定は非適用。対象はローカルファイルを読む短命 CLI 経路であり、性能の実質的制約は「読込回数と計算量の構造」(PR-U2-1〜2)と「CI 時間枠の前提を壊さない」(PR-U2-4)で完全に表現できる。TLC 探索自体の時間予算は u5-ci-all-models-measure の責務(実測 + 30 分 timeout 整合)であり、本 Unit では重複設定しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T21:52:59Z
- **Iteration:** 1
- **Scope decision:** none

All 5 produces exist; NFRs measurable with BR/FR traceability; N/A evidence-based; 2 advisory minors (qualitative perf thresholds, acceptable). READY.

### Findings

- None
