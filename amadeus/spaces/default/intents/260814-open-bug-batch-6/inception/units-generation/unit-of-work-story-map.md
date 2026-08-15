# Unit ↔ Requirement Map — 260814-open-bug-batch-6

## トレース方針

user-stories ステージは本スコープで SKIP のため(stories 不在)、ユニットは requirements.md の FR へ直接トレースする。

## Unit ↔ FR 対応表

| Unit | FR | Issue | 価値(ユーザー可視の回復) |
| --- | --- | --- | --- |
| U-1 landed-finalization | FR-1 | #3062 | merge queue 運用下で pr-convergence ステージが正規経路で完了できる(手動逃がし不要) |
| U-2 sensor-declaration | FR-2 | #3026 | model-completeness センサーが投影・発火可能になり、宣言漏れクラスに検査が付く |
| U-3 docs-sensors-sync | FR-3 | #3028 | ハーネスエンジニアが docs から正しいセンサー全数を得られる |
| U-4 worktree-gc-determinism | FR-4 | #3031 | CI の偽陽性赤(transient)による再実行コストの解消または根拠付き免除 |
| U-5 audit-sink-investigation | FR-5 | #3032 | 実 record の監査純度(汚染機序の確定または反証つきクローズ) |

## トレーサビリティ検証

全 FR が Unit へ 1:1 写像され、孤児 FR・孤児 Unit ともに 0 件(FR 5 件 = Unit 5 件、表の全数照合)。
