# Performance テスト手順 — intent 260805-semi-redefine-autonomy-f(#2253)

上流入力(consumes 全数): `code-generation-plan.md`(全 7 Unit)、`code-summary.md`(全 7 Unit)

## 判定: 本 intent 固有の性能検査は生成しない(N/A)

Comprehensive strategy でも、performance 検査は**承認済み NFR と実在境界へ trace できる範囲だけ**生成する。戦略名だけを根拠に負荷試験・ベンチマークを機械追加しない。

**反証可能な不存在根拠**(測定 ref: conductor クローン HEAD `74b70f40b`):

- 7 Unit の `nfr-design/` 配下に performance-design 成果物は存在しない。実在するのは各 Unit の `security-design.md` と `logical-components.md`(`semi-docs-revision` は docs 専任のため `logical-components.md` なし)。
- 同ディレクトリ群に対する `performance` / `性能` / `p95` / `latency` の grep はいずれも 0 hit。
- 各 Unit の `code-generation-plan.md` / `code-summary.md` に性能受け入れ基準(閾値・予算・退行上限)の記載はない。

本 intent の変更面は認可判定・指令搬送・statusline セグメント・advisory 解決・docs であり、いずれもホットパスの実時間予算を宣言していない。

## 既存の性能ゲート(本 intent が依存する面)

新規の負荷試験は作らないが、リポジトリの既存性能面は変更前後で維持される必要がある:

- `tests/perf/` 配下のベンチマーク(`perf.yml` ワークフロー)。本 intent はこれらの閾値を変更していない。
- 複雑度 ratchet(`bun tests/complexity-gate.ts --check`)は shrink-only。実測 exit 0(`0 new violations, 0 regressions`)。

## 将来この判定を覆す条件

以下のいずれかが現れた時点で、本書を実検査へ差し替える:

1. 認可判定(`SemiAuthority` / `authorizeInteraction`)がステージ発行のホットパスに入り、1 発行あたりの実時間予算が NFR として宣言される。
2. advisory 解決が外部 I/O(ネットワーク・サブプロセス)を同期で待つ設計へ変わる。
3. statusline セグメントの描画が state ファイルの全読み込みを毎ターン行う実装へ変わる。

長い本番タイムアウトを持つ性能要件を検査する場合は、実時間待機ではなく、同じ制御経路を通る短縮可能なタイミングシームと counter assertion + 退行上限で構成する。ベンチマークに baseline 相対項を置く場合は、baseline 系列が対象系列と負荷を共有することを実装前に負荷スイープで実測してから採用する(空ウィンドウ baseline は相対項を絶対判定へ無音退化させる)。
