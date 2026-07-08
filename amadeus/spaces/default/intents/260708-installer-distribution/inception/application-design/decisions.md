# Decisions(ADR)— `@amadeus-dlc/setup`(installer-distribution)

> ステージ: application-design (2.6) / 作成: 2026-07-08
> 出典: `application-design-questions.md` Q2〜Q4、`../requirements-analysis/requirements.md` OQ-002・OQ-003

## ADR-001: promote-self.ts は共有せず、設計参照のみで独立実装する

- **Context**: `scripts/promote-self.ts`(278行)は所有判定・差分検出・check/apply 分離を実装済みで、feasibility R4 の緩和策は「この資産の移植」を挙げていた(OQ-003)。ただし同スクリプトはリポジトリルート固定・管理ファイルのハードコード・byte-diff 方式という**この repo 専用の dogfood ツール**であり、setup の非破壊マージは「マニフェスト期待 md5+`$namefile.$timestamp.bk` 退避+任意ターゲット操作」で要件が異なる
- **Decision**: `packages/setup` は planner/applier を**独立実装**する。promote-self の実証済みパターン(walk、preserved 判定、check/apply 分離)は設計参照として移植するが、コード共有・共有モジュール抽出は行わない
- **Consequences**: (+) dogfood ツールと公開 CLI が独立進化でき、相互破壊がない。(+) construction フェーズルール「意図ベースの重複排除 — 変更理由が異なるコードは統合しない」に合致。(−) walk/copy 相当の概念的重複が2箇所に存在する(それぞれ小さく、テストは各自の契約で担保)
- **Alternatives Rejected**: (B) 共有モジュール抽出 — workspace 内結合が増え、repo 内部ツールの変更が公開 CLI の publish 単位に波及する。変更理由が異なるため統合の前提を欠く
- **Security/Compliance**: 影響なし(コード配置の決定。公開物に repo 内部ツールを含めないことでパッケージ表面積はむしろ縮小)

## ADR-002: bun build による単一ファイル ESM バンドル(target: node)

- **Context**: FR-002 は npx(Node)/bunx(bun)両対応を要求する。ソースは TypeScript で保守したいが、npx 実行系は TS を直接実行できない(OQ-002)。リポジトリのビルドツールチェーンは bun のみ
- **Decision**: `bun build src/cli.ts --target=node --format=esm` で `dist/cli.js` 単一ファイルへバンドルし、shebang `#!/usr/bin/env node` を付与、`bin.amadeus-setup` がこれを指す。publish 対象は dist/cli.js+README+LICENSE 2種(FR-018 の契約)
- **Consequences**: (+) 実行時依存ゼロを成果物レベルで保証(NFR-005)。(+) pack 検証(FR-018)の契約が単純。(+) Node ≥18.3 と bun の双方で動作(正確なフロアは U1 nfr-requirements/tech-stack-decisions の権威記述に従う — parseArgs 由来)。(−) publish 前にビルドステップが必要(FR-015 手順書に組み込み)。(−) スタックトレースがバンドル行になる(sourcemap は初回スコープ外)
- **Alternatives Rejected**: (B) tsc マルチファイル出力 — ファイル数が増え pack 契約が複雑化、tsc の emit 設定を新規追加する必要。(C) TS のまま publish — npx で動かず FR-002 違反
- **Security/Compliance**: バンドルにより同梱物が固定され、意図しないファイル混入を FR-018 テストで検出しやすい。ライセンスは LICENSE 2種を明示同梱

## ADR-003: 認証なし GitHub REST API + codeload アーカイブ URL

- **Context**: FR-006 のバージョン解決(Release → タグ、SemVer 順序)と配布物取得には GitHub との通信方式の確定が必要。ユーザー環境には git バイナリや GitHub 認証があるとは限らない
- **Decision**: バージョン一覧は認証なし REST(`/repos/amadeus-dlc/amadeus/releases`、`/tags`)で解決し、アーカイブは `codeload.github.com/.../tar.gz/refs/tags/vX.Y.Z` から取得する。1実行あたりの API 呼び出しは最大2回に抑える
- **Consequences**: (+) 認証不要・git 非依存で新規ユーザーの前提が最小。(+) rate limit(60 req/h/IP)は CLI の利用頻度で実用十分。(−) 大規模 CI での高頻度実行は rate limit に当たり得る — 403/429 を rate-limit 分類し待機案内(FR-012)。将来 `GITHUB_TOKEN` 環境変数の任意利用を拡張余地として残す(初回スコープ外)
- **Alternatives Rejected**: (B) `git ls-remote --tags` — git バイナリ依存が増え、tarball 取得は結局 HTTP。(C) GraphQL API — 認証必須で新規ユーザーの1コマンド体験と矛盾
- **Security/Compliance**: 通信は HTTPS のみ。認証情報を扱わない(漏洩面なし)。取得物の完全性はサイズ/展開検証+導入後検証(FR-013)で担保し、署名検証は provenance と併せ将来検討(scope W5)

## 決定の要約表

| ADR | 決定 | 影響する FR/OQ |
|-----|------|----------------|
| ADR-001 | promote-self は設計参照のみ・独立実装 | OQ-003、FR-008、R4 |
| ADR-002 | 単一ファイル ESM バンドル(node target) | OQ-002、FR-002、FR-018 |
| ADR-003 | 認証なし REST + codeload | FR-006、FR-012 |
