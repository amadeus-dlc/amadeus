# Business Logic Model — U2 perf-workflow

上流入力(consumes 全数): unit-of-work.md(U2 定義・依存 U1)、unit-of-work-story-map.md(ジャーニー2 — 運用者の監視体験)、requirements.md(FR-2、NFR-2)、components.md(C-3)、component-methods.md(C-3 job 表 — timeout 実測導出 25/5/5)、services.md(実行面表 — perf.yml 2行の非 blocking 区分)

測定 ref = observed `da51af375`。

## ロジック0: 実行面の位置づけ

unit-of-work.md U2 の定義(deployable 根拠 = daily 性能監視の稼働、依存 = U1 の --perf 実体化)と unit-of-work-story-map.md ジャーニー2(運用者: 退行検知 daily+dispatch / 失敗の loud 可視化 / drift 観測継続)を実現する。components.md C-3 が構成の正本、component-methods.md C-3 表が job/timeout の詳細。本 Unit は services.md 実行面表の「perf.yml perf-tests」「perf.yml distribution-benchmark(+aggregate)」の2行を実体化する。blocking 面(ci.yml)には一切触れない(追加 workflow のみ — U3 が削除を担う)。

## ロジック1: トリガー

```
on:
  schedule:
    - cron: "47 17 * * *"   # ADR-5: UTC 17:47 = JST 02:47、0/30分回避
  workflow_dispatch: {}      # 手動実行(AC-2 の検証経路)
```

## ロジック2: job 構成(component-methods.md C-3 表の写像)

```
perf-tests(timeout 25):
  checkout → setup-bun 1.3.13 → bun install --frozen-lockfile
  → bash tests/run-tests.sh --perf
  → (always) upload artifact amadeus-perf-test-size-report: tests/logs/test-size-report.json
  → (failure) STEP_SUMMARY へ要約
distribution-benchmark(matrix replica 1-3、fail-fast false、timeout 5):
  ci.yml :224-253 の step 列を移植(bun run distribution:benchmark | tee → artifact upload)
distribution-benchmark-aggregate(needs distribution-benchmark、timeout 5):
  ci.yml :255-277 を移植(download replicas → bun run distribution:benchmark:aggregate)
  → (failure) STEP_SUMMARY へ要約
concurrency: group perf / cancel-in-progress false
```

## ロジック3: 失敗の可視化(FR-2d)

perf-tests / aggregate の失敗 step で `$GITHUB_STEP_SUMMARY` に「どの検証面が赤か(runner 出力の末尾要約)」を追記。自動起票なし(Q3=B)。

## timeout の有界性(NFR-2)

requirements.md NFR-2(perf.yml の総実行時間は timeout-minutes で有界、値は実測導出)は component-methods.md C-3 表の 25/5/5 で充足 — ロジック2 に転記済み。

## 検証計画

- PR 段(静的): yml の job/trigger/needs/timeout の実読照合、`ci-success` needs に不介入の確認(AC-2 後段)、actionlint 相当の構文検証(bun 環境では yml parse で代替)
- マージ後(動的): workflow_dispatch 実行 → 全 job green を gh run watch で実測(AC-2 前段)。cron 初回発火は翌日 gh run list で確認
- TDD 適用外分類(NFR-3): yml は実行時振る舞いを持つが runner 外(GitHub 実行)— 落ちる実証は dispatch 実測で代替し、workflow 内容の drift は FR-3d 対照表(V-1〜V-4/V-7/V-8)との突き合わせで検査

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T10:55:31Z
- **Iteration:** 1
- **Scope decision:** none

ロジック・BR・二重実行窓の扱いは C-3 表と整合し健全。3成果物の consumes ヘッダに unit-of-work/story-map 等の本文未接地(装飾トークン)と NFR-2/components.md の誤帰属があり NOT-READY。

### Findings

- [Major] business-logic-model.md:3: unit-of-work/story-map/components.md 本文未参照、NFR-2 過大申告
- [Major] domain-entities.md:3: unit-of-work/story-map/requirements.md 本文未参照
- [Major] business-rules.md:3: unit-of-work/story-map 本文未参照

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T10:57:39Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 の3指摘は実引用で全閉包(引用先内容との逐語一致を確認)。総当たり grep で未参照 consumes ゼロ。新規指摘なし。

### Findings

- None
