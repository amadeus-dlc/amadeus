# ユースケース

## 一覧

| 識別子 | アクター | 外部システム | ストーリー | 要求 | 依存 | 詳細 |
|---|---|---|---|---|---|---|
| UC001 | ACT002 Agent | なし | なし | R001, R002, R003 | なし | [UC001-review-phase-startup-prerequisites.md](use-cases/UC001-review-phase-startup-prerequisites.md) |
| UC002 | ACT002 Agent | なし | なし | R004 | UC001 | [UC002-route-prerequisite-failure.md](use-cases/UC002-route-prerequisite-failure.md) |
| UC003 | ACT002 Agent, ACT001 Maintainer | EXT001 GitHub | なし | R005 | UC001, UC002 | [UC003-separate-repo-example-from-distribution.md](use-cases/UC003-separate-repo-example-from-distribution.md) |

## 依存関係

| ユースケース | 依存 | 理由 |
|---|---|---|
| UC001 | なし | phase skill 起動時の前提確認が後続分類の前提であるため。 |
| UC002 | UC001 | 前提不成立の分類は、起動時確認の結果を入力にするため。 |
| UC003 | UC001, UC002 | 代表例の扱いは、前提確認と分類先が決まってから配布対象 skill の説明へ分離するため。 |

## User Stories 省略理由

この Intent の主な相互作用主体は、phase skill 起動時に判断する Agent と、Issue や PR を根拠として参照する GitHub である。

Maintainer は stage0 採用判断やレビューで関与するが、要求の中心は人間アクターの価値表現ではなく、phase skill 起動時の前提確認である。

そのため、User Stories は作らず、ユースケースの Story 参照は `なし` にする。
