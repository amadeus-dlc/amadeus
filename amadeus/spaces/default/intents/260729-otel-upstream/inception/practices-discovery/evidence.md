# Evidence — Practices Discovery

上流入力（consumes 全数）: `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md`（参照済み）

4レーン並列スキャンの finding 要約と、インタビューで確定した事項の記録。

## pipeline-deploy レーン（branching・CI・deploy）

- 実測: GitHub Flow（squash）、CI は ci.yml の全ゲート必須（ci-success 集約）、release.yml dispatch 一本、環境トポロジなし（CLI 配布）
- affirmed との整合: 一致

## quality レーン（testing posture）

- 実測: 819 本の TS テスト（unit 323／integration 315／e2e 85／smoke 15）、bun test＋自作 runner、feature/fix とテスト同一コミット（実質 red-green-refactor）、coverage ゲート3種（project baseline 40.9%／patch／relative）、PBT fast-check 4本＋TLA+、test-size 分類の機械強制
- affirmed との整合: ほぼ一致。**差分1件** — project.md ## Testing Posture の CI 基準リストに coverage ゲートと plugin-conformance-e2e が未記載（現行 CI では両者ブロッキング）→ Q2 で更新承認

## developer レーン（code style・境界）

- 実測: 正本2層（core／harness）と dist 生成物の境界、1ツール1ファイル・命名規約、エラーハンドリングは Result 型＋例外＋emitError のハイブリッド、biome 2.4.16（formatter off・CCN warn@15）、knip
- affirmed との整合: 一致。`amadeus-lib.ts` 7,975行のモノリスは歴史的混在として記録

## devsecops レーン（security・supply chain）

- 実測: SAST/DAST/secret-scan 設定なし、CI は `--frozen-lockfile`、Dependabot/Renovate なし、mkdir ベース audit lock、redaction は `META_SAFE_KEYS` default-deny＋fail-closed parse
- **発見（#1672 制約「機微情報を Signal Stores へ流さない」へのギャップ）**: (1) redaction は write-time のみで export 境界にフィルタなし（`amadeus-otel-projector.ts:218/:233` が buffer meta を verbatim 展開）、(2) `command` が safe-key で argv にトークン混入の余地、(3) `redactionOptIn` が値スクラブなしの無制限キー許可、(4) telemetry 成果物の credential-free を検査するゲート未配線、(5) OTLP exporter に auth header なし → Q3 で Mandated ルール追加を承認

## インタビュー回答（ギャップ3問）

- Q1: Walking Skeleton stance = **on**（Phase 1 が walking skeleton、greenfield 要素を含むため）
- Q2: Testing Posture の CI 基準リストを現行ブロッキング集合へ**更新**
- Q3: export 境界 redaction の Mandated ルールを**追加**

（参考）回答はソロ運用でユーザー本人が AskUserQuestion で直接回答。ゲート早期オープン（RE ステージの subagent report 試行に由来）のため QUESTION_ANSWERED の audit row はエンジンに拒否され、本ファイルが回答の記録となる。
