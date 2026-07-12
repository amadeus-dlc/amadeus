# User Stories Assessment — metrics-observation

- 分割方式: ジャーニー別エピック(user-stories:c1 — 導入/観測/保守)。E2E テスト設計(A-1 の workflow 実証、A-2 の注入テスト)への対応が自然。
- 網羅性: FR-1〜FR-6 の全 FR がいずれかのストーリー AC に対応(FR-1→B-1、FR-2→A-1/B-1、FR-3→A-1/C-2、FR-4→A-2、FR-5→B-1/B-3/C-1、FR-6 は開発者向け配置契約のためストーリー外の工程要件)。
- 独立性: 各ストーリーは単独で Given/When/Then 検証可能(順序依存なし — B 系は「複数 snapshot が存在する」を Given に明示)。
- ペルソナ: 3種(観測者/実装者/保守者)。いずれも本チームの実在役割に対応し、仮想ペルソナの発明なし。
