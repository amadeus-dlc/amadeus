# Security Test Instructions — 260810-control-byte-gate

上流入力(consumes 全数): code-generation-plan.md(Step 3 の allowlist 契約強化と Step 5 の CI permissions — 本書の対象面の導出元)、code-summary.md(§セキュリティ面の確認と BR-4/BR-9 の逐条監査 — 本書が引く実測の出典)。

## 適用判定

**適用あり(限定)**。SAST/DAST・認証試験・インジェクション試験は**作らない**。

- **本 Unit に攻撃面がほぼない** — ゲートは読取専用のローカル CLI で、ネットワーク・シークレット・認証を一切使わず、書込を行わない(NFR-4 / security-design.md)。認証境界も外部入力経路も持たないため、認証試験とインジェクション試験は対象がない。
- **DAST は対象サービスが存在しない**ため非適用。
- **SAST はリポジトリ共通面で既に走っている** — 本 Unit のためだけに別スキャンを足さない。
- **ただし security-design.md が名指しする脅威は2つあり、いずれもテストで固定済み**。それを下に明記する。無言で省略すると黙示の欠落になるため、非該当と該当を書き分ける。

## 固定済みのセキュリティ性質

| 脅威(security-design.md) | 対策 | 検証の所在 |
|---|---|---|
| allowlist の悪用(バイナリ偽装での検査回避) | エントリは path 完全一致 + `reason` 非空を load 時に assert + 不在エントリは stale で fail-closed | `t-control-byte-gate.integration.test.ts` の allowlist 3ケース(skip / stale / `assertAllowlistWellFormed`) |
| 読取不能ファイルの無音 skip による検査回避(NFR-3) | `readErrors` へ集計し非0 exit。skip 経路なし | 同ファイルの読取不能ケース |

## CI ジョブの権限面

- `control-byte-gate` ジョブの checkout は `persist-credentials: false`。このジョブは PR 由来のコードを走らせるため、トークンをローカル git config へ残さない。
- ワークフロー既定の `permissions: contents: read` を継承し、追加権限を要求しない。

検証は `t-formal-verif-ci-workflow.integration.test.ts` のベースライン pin が担う — ci.yml への未承認の編集は正規化 digest を変えて赤くなる。

## 依存追加ゼロ(NFR-4)

サプライチェーン面の最小化として、ランタイム依存を1つも追加していない(Bun 標準 API + git spawn のみ、外部 grep 呼び出しゼロ)。`package.json` の依存は無変更。

## この判定を覆すべき条件

- ゲートがネットワーク・シークレット・書込のいずれかを持つようになった場合
- allowlist が人手編集以外の経路(生成・外部入力)から供給されるようになった場合
- CI ジョブが `contents: read` を超える権限を要求するようになった場合
