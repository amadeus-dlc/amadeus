# Performance Design — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): performance-requirements(PR-U2-1〜4), security-requirements(構造共有のみ), scalability-requirements(SC-U2-1〜3 — 構造的拡張性は本ファイルに畳込), reliability-requirements( fail-fast 順序の共有), tech-stack-decisions(TS-U2-2 単一実装共有), business-logic-model(§1.1 単一読込原則, §1.2 検証順序, §2.1 readModule アダプタ, §3.1 戻り型)

本 Unit は短命 CLI 検証経路であり、キャッシング・コネクションプール・非同期処理・CDN 等のサービス系性能機構は非適用。性能設計の全ては「読込回数と計算量の構造」を functional-design が既に規定した機構へ写像することにある。新規機構は導入しない。

## NFR → 機構マッピング

| # | 要求 | 設計機構(functional-design 参照) | 検証方法(証明するテスト/AC) |
|---|---|---|---|
| PR-U2-1 | 資産の読込・identity 計算はモデルごとに各1回(単一読込原則) | business-logic-model §1.1: 全モデルループで読込した bytes / TextDecoder 済み source / identity を `VerifiedModelSource` の素材としてモデルごとに保持し、identity 照合・戻り値構築・宣言解決(readModule アダプタ、§2.1)の3経路で**同一読込結果を流用**する。照合 bytes と解決ソースの取り違え(TOCTOU 的齟齬)は「identity 照合済み bytes を解決にも使う」結線で構造的に排除される | t403: 注入 fs の readAsset 呼出回数が資産数と一致(u2 AC1 の緑ケースで assert)、または code review で単一経路を確認 |
| PR-U2-2 | 計算量は O(n×m + 推移閉包)の線形 | 全モデルループ(§1.1)はモデル数 n × 資産数 m の単純直列ループ、宣言照合(§2.2)は u1 リゾルバの線形境界に乗る。指数再帰・全ペア比較を持ち込まない。u1 `tla-module-deps.ts` 単一実装の共有(TS-U2-2)で loader 側に複製実装を置かず、計算量特性のドリフトを防ぐ | 既存の単体/統合テストの実行時間が改訂前と同オーダー(wall-clock 代替確認。大幅悪化時は原因調査) |
| PR-U2-3 | fail-fast 直列、最初の失敗で打ち切り | business-logic-model §1.2 の検証順序を据置き: (1) root 解決 + map parse → (2) 全モデル identity 照合 → (3) 宣言-vs-解決照合 → (4) entries 照合。いずれかの失敗で即 return し、残資産を読み続けない(部分結果を返さない) | t403 の赤ケース群が BR-V6 どおりのエラー種で打ち切られる(統合テスト既存分類ケース :118-165 が意味を保つ) |
| PR-U2-4 | loader 全モデル化は CI 探索時間に寄与しない | loader は TLC 探索の外側で ms〜秒級のファイル検証のみを行う。TLC 実行時間の測定・30 分 timeout 整合は u5-ci-all-models-measure の責務(実測方針 FE Q1=A)であり、本 Unit は前提を壊さないことだけを確認する | 既存テスト wall-clock で代替確認(u5 の測定プロトコルへフォワード参照) |
| SC-U2-1 | モデル数・名前・パスのハードコード撤廃(構造的拡張性) | §0-3: `TLA_EXECUTION_MODEL_NAME` / `TLA_MODEL_PATH` / `TLA_CFG_PATH` の固定導出を撤廃し、第3モデル登録が model-map.json 追記のみで成立する構造へ | grep で loader 内の固定モデル名・固定パス参照 0 件、t403 の2モデル fixture green |
| SC-U2-2 | `models` 配列は宣言順(= 名前昇順)で決定的 | §3.1: parser 強制の一意・名前昇順をそのまま使い、追加ソートも fs 列挙順の混入もしない | t403 の配列順序 assert |
| SC-U2-3 | モデル増で指数悪化しない | PR-U2-2 と同一拘束(重複設定しない) | PR-U2-2 に同じ |

## 非適用カテゴリ

レスポンスタイム目標(p99 等)・スループット・リソース利用率上限・キャッシュ/プール/非同期パターンは非適用。根拠は performance-requirements「非適用の判断」節のとおり: 対象はローカルファイルを読む短命 CLI 経路であり、性能の実質的制約は上表 PR-U2-1〜4 で完全に表現できる。TLC 探索の時間予算は u5-ci-all-models-measure の測定プロトコル(実測 + 30 分 timeout 整合)へフォワード参照する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T22:06:14Z
- **Iteration:** 1
- **Scope decision:** none

All 5 nfr-design artifacts complete, house-styled, all 15 NFR IDs mapped to existing functional-design mechanisms with named verification. Findings: none.

### Findings

- None
