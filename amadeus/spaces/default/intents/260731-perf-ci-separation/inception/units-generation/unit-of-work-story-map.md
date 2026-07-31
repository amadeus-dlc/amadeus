# Unit of Work Story Map — 260731-perf-ci-separation

上流入力(consumes 全数): components.md、component-methods.md(timeout 実測導出)、services.md(ジャーニー2の実行面)、component-dependency.md(リリース順)、decisions.md(ADR-5 cron)、requirements.md、stories(N/A — user-stories は self-feature の EXECUTE 集合で SKIP。application-design 各成果物と同判断)

利用者(開発者・conductor)のジャーニー別に Unit を配置する(requirements.md の FR 番号で追跡)。

## ジャーニー1: PR を出す開発者

| 体験 | Before | After | 提供 Unit |
|---|---|---|---|
| PR CI の待ち時間 | perf テスト込みの integration tier ×最大3回 + benchmark 4 job | perf 除外の高速 CI(FR-1/FR-3) | U1、U3 |
| 偽赤による再実行 | t258 timeout flake(本日4回級 — #1835) | 構造的に発生不能(blocking 面から除去) | U1 |
| CI 構成の理解 | docs は旧構成 | tier 一覧・perf.yml の記述(FR-6) | U4 |

## ジャーニー2: 性能退行を監視する運用者

| 体験 | Before | After | 提供 Unit |
|---|---|---|---|
| 退行検知 | PR ごと(ただし偽赤混じり) | daily perf.yml + 手動 dispatch(FR-2、遅延最大24h は受容済み — A-3) | U2 |
| 失敗の可視化 | PR 赤(ノイズ) | workflow 失敗 + STEP_SUMMARY(FR-2d) | U2 |
| drift 観測 | ci.yml artifact | perf.yml artifact 継続(R-2) | U2 |

## ジャーニー3: カバレッジ・品質ゲートの維持者

| 体験 | Before | After | 提供 Unit |
|---|---|---|---|
| coverage gate | perf テスト込み母集団 | 除外後 baseline へ再カット・registry 整合(FR-5) | U1 |
| 検証の所在 | ci.yml に混在 | 対照表 V-1〜V-8 で行き先が機械照合可能(FR-3d) | U3(照合)、U1/U2(実体) |

## リリース順の価値

U1(偽赤解消 = 最大の痛み)→ U2(監視の受け皿)→ U3(コスト削減)→ U4(文書整合)。dependency-first(intent-backlog.md のシーケンス選好)と価値順が一致する。
