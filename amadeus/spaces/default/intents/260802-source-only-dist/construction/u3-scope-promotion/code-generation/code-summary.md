# Code Generation Summary — u3-scope-promotion

## 実装結果

- `self-feature` / `self-fix` / `self-refactor` / `self-document` / `installer-distribution` の5 scope定義を `packages/framework/core/scopes/` へ昇格した。採用元の移行前 `.claude/scopes/` と本文byteを一致させた。
- 32 canonical stageのfrontmatter `scopes:` を移行前15-key gridから導出し、25 stageへ必要なmembershipを追加した。`scope-grid.json` は直接編集せずcompileで生成した。
- 7配布ハーネスと5 dogfood faceを正規のpackage / promote経路で同期した。既存のcomposed scope rowとplugin固有cellを保持するmerge境界は変更していない。
- self-scope-consistency sensorを5昇格scopeのファイル、grid row、canonical cell、本文の対称性へ拡張した。
- 移行前gridを固定fixtureにし、core正本、transpose、全projection、scope本文を一つのintegration testで検証した。coverage registryも15 scopeをcoveredとして再生成した。

## 判断とトレーサビリティ

- FR-0.1: 5定義のcore昇格と全projection presence / byte一致で検証した。
- FR-0.2: stage frontmatterを唯一のcanonical membershipとし、固定oracleの全canonical cellと一致させた。
- FR-0.3: sensor実装・manifest・fixture・real dogfood facesを5 scope対称へ更新した。
- BR-U3-6: `mergeScopeGrid` / `scopeGridInSync` は変更せず、composed extras・prototype名scope・冪等性の既存回帰テストを維持した。
- BR-U3-7: 実装前の新規テストは0 pass / 4 failで、5 core scopeとinstaller projectionの欠落を実際に検出した。

## 検証結果

- 対象10 files: 233 pass / 0 fail / exit 0。
- 全 `test:ci` 初回: 755 filesを完走し、旧10-scope固定期待値だけが4 files / 6 assertionsで失敗。修正後の該当5 filesは91 pass / 0 fail / exit 0。
- scope / compose関連34 files: 257 assertions / 0 fail。smoke全15 files: 364 assertions / 0 fail。
- `bun run lint`: exit 0。既存baselineのcomplexity等386 warnings / 23 infosのみ。
- `bun run typecheck`: exit 0。
- `bun scripts/package.ts --check`: 7 harnessすべてOK。
- `bun run promote:self:check`: 5 self-install faceすべてOK。
- `bun tests/gen-coverage-registry.ts --check`: freshness / guards / ratchetすべてOK。
- 採用元byte比較、`git diff --check`: exit 0。

## 逸脱・残課題

- 設計からの逸脱はない。cold timeoutも発生していない。
- 残課題はない。
