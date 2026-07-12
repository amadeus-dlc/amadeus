# Security Requirements — metrics-observation

- **S-1: 最小権限** — `contents: write` は metrics-snapshot job のみ(workflow 全体は read 維持)。実測ベース: ci.yml 現行 :24/:80 read、release.yml :48 の前例様式。
- **S-2: secrets 非使用** — GITHUB_TOKEN(自動供給)以外の credential を導入しない。snapshot 内容は公開リポジトリの派生統計のみ(機微情報なし)。
- **S-3: 入力境界** — collector の入力は repo 内部の成果物(lcov/totals/ソース)のみ。外部入力なし。JSON parse は検証付き(verification-numeric-parse — 数値は parse してから比較)。
- **S-4: コミット author** — bot author(release.yml 前例の github-actions 形式)で人間コミットと機械コミットを監査上区別可能に。
