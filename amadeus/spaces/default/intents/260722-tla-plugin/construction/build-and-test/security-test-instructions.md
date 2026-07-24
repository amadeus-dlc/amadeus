# Security Test 手順

上流入力(consumes 全数): 5ユニットの `code-generation-plan.md` と `code-summary.md`

## 対象脅威

- Tampering: composition record/index/stage body/model-map/artifact digestの改竄。
- Information Disclosure: absolute path、hash、file内容、secret、環境変数全量の漏えい。
- Elevation/Boundary Escape: traversal、ancestor/final symlink、repository外path、writable mount。
- Denial of Service: 16MiB/64MiB上限、9/10秒sensor deadline、180秒TLC deadline、process/container回収。
- Supply Chain: Docker image digest、TLC jar SHA-256、GitHub Actions commit SHA、依存脆弱性。

## 実行方法

```bash
bash tests/run-tests.sh --ci
bun audit
```

対象integration/E2EはO_NOFOLLOW、realpath containment、dev/inode、通常ファイル、同一fd完全読取、SHA-256、network deny、read-only mount、redactionを検証する。

## 合格基準

- 今回変更したplugin/TLC/sensor境界のsecurity regression testが全てPASS。
- secret、host absolute path、file bodyを外部エラーへ出さない。
- `bun audit`の新規Critical/Highを0とする。既存transitive advisoryは対象変更との差分を確認し、別リスクとして明示する。

## 現在の依存監査

`bun audit` はexit 1で、既存の `@anthropic-ai/claude-agent-sdk` → `@modelcontextprotocol/sdk` 経由にHigh 3、Moderate 8、Low 1を検出した。`package.json` と `bun.lock` は `origin/main` から変更されておらず、本intentによる新規dependency regressionではない。リリース準備度は条件付きとし、依存更新を本修復へ暗黙同梱しない。
