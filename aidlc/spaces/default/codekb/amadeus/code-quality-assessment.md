# コード品質評価：amadeus

## テストの状態

- CI 入口は `npm run test:all`（= `test:ci:mock`）で、typecheck、lint（複雑度 20 上限、公開型 1 ファイル 1 個）、contracts:check、claude-wiring:check、eval 12 本、mock e2e 4 本（steering / event-storming の initial と rerun）、examples 検査（workspace / Intent validator、provenance md5、段階不変条件、生成計画）、diff:check を含む。現時点で全て green である。
- validator の検証は dev eval（合成 workspace + v2 シナリオ 8 件 + schemaVersion 1 拒否）と、examples の実 snapshot 4 本で二重にカバーされる。
- real provider の経路（claude / codex runner）は CI 対象外で、examples 生成時にだけ通る。

## 主要なリスク

この Intent（v2 完全準拠）に対するリスクは次である。

1. **契約の三重持ち**: ステージと成果物の対応が docs、stage-catalog.md、lifecycle-v2.ts の 3 箇所にあり、移行中の不整合が validator fail や eval fail として現れる。改名は 3 箇所同時に進める必要がある。
2. **examples の再生成コスト**: 成果物名と workspace 構造の変更は snapshot 全 4 本の real provider 再生成を要する（1 周あたり実セッション 4 本）。生成プロンプトの期待値（examples-contract）を先に確定しないと手戻りする。
3. **状態形式の移行**: `state.json`（JSON）から `aidlc-state.md`（Markdown）への移行は、validator の parse 層と `amadeus` 入口の読み書き、e2e fixture、examples の全 state に波及する。Markdown 状態の決定論的な parse 契約を functional design で確定する必要がある。
4. **自己開発 workspace の自己参照**: この Intent 自身が `.amadeus/` 配下にあり、移行（`aidlc/spaces/` 化）は進行中の Intent 自身の置き場所を変える。移行手順に「実行中 Intent の record 移設」を含める必要がある。
5. **横断改名の見落とし**: `questions.md` など 12 stage に及ぶ改名は、SKILL.md 本文、テンプレート、eval 期待値、文書の 4 面に散る。機械的な一覧（lifecycle 文書の v2 対応列）を基準に消し込むのが安全である。
