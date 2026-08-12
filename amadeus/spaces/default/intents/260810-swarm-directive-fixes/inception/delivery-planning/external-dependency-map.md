# External Dependency Map

入力: [`requirements.md`](../requirements-analysis/requirements.md)、[`components.md`](../application-design/components.md)、[`unit-of-work.md`](../units-generation/unit-of-work.md)、[`unit-of-work-dependency.md`](../units-generation/unit-of-work-dependency.md)、[`unit-of-work-story-map.md`](../units-generation/unit-of-work-story-map.md)。Stories / mockups / team-practices は本 scope で非実行。

## Gated Dependencies

| Dependency | Owner | Lead time | Blocks | Mitigation / evidence |
|---|---|---:|---|---|
| Bolt 1 PR merge approval | parent leader session + user | human-dependent | Bolt 1 merge、Bolt 2 mergeability再確認 | PR URLとconvergence reportを即時転送。AIはmergeしない |
| Bolt 2 PR merge approval | parent leader session + user | human-dependent | Bolt 2 merge、final cross-unit validation | Bolt 1着地後のmergeability/conditional update結果を添付。AIはmergeしない |
| GitHub PR checks | GitHub Actions | variable | each PR convergence | mergeable/check statusを監視し、base conflictを先に解消 |

外部API、data window、cloud resource、database、external team hand-offはない。GitHub Issue本文/全コメントはRequirements Analysis前に取得済みで、実装時の外部読み取り依存にはしない。

## Internal Gates

- Bolt 1: TDD evidence → focused gates → PR → convergence → leader user approval。
- Bolt 2: TDD evidence → focused gates → PR → initial convergence → Bolt 1 landing → mergeability実測 → 必要時だけupdate → convergence → leader user approval。
- Both landed: existing Build and Test stageがcross-unit acceptance、full CI、source-only/distributionを検証。

## No-AI-Merge Boundary

PRを作成・更新・収束させることは許可範囲。merge操作はユーザー承認まで禁止し、承認伺いはこのworktreeではなくparent leader worktreeへ報告する。
