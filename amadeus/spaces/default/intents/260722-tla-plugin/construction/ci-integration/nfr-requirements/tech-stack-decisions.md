# Tech Stack Decisions — U4 ci-integration

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 選択

| 領域 | 技術 | 根拠 |
|---|---|---|
| CI | GitHub Actions `ci.yml` | 既存blocking帯域と同居 |
| Runner | `ubuntu-latest` | ユーザー裁定済みLinux環境 |
| Isolation | Docker `--network=none` | runner内で再現可能 |
| JDK | eclipse-temurin digest固定 | 権威あるJDK供給元 |
| TLC | tla2tools.jar版/checksum固定 | 公式releaseを検証可能 |
| Bun | `oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6 # v2` + `bun-version: 1.3.13` | 公式v2 tagのcommitを2026-07-24に`git ls-remote`で検証し、独立jobでruntimeを固定 |

## 退役と互換性

- `.github/workflows/formal-verification.yml`を削除し、二重workflowを持たない。
- push/PR経路は許容3変更以外baseと全文一致で保護する。
- formal jobの順序は checkout → Bun固定setup → runtime receipt → jar取得/検証 → model check(exitをcapture) → artifact verify → `if: always()` upload → capture済みexit再送出、とする。
