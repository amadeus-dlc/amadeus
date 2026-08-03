# Code Generation Plan — u6-allowlist-canonical

## 目的と境界

`packages/framework/core/tools/data/self-install-allowlist.ts` を allowlist の単一正本とし、`tracked`（5設定 + dispatcher）、`preservedRuntime`（5件）、`perUserPatterns`（既存 regex 4本）を一元管理する。`scripts/promote-self.ts` の preserved と regex 定義は正本 import に置換する。

本 Unit では `.gitattributes` の実ファイル整合を検査する。`.gitignore` は切替前で対象節が存在しないため、期待値を導出する純関数と unit test までとし、実ファイル突合と `.codex/local/` の ignore 追加は u8 に引き渡す。`scripts/promote-self.ts` の composeRootAgents 等、u5 所有範囲は変更しない。fallback、互換 shim、生成物の直接編集は行わない。

## 実装ステップ

### Step 1 — 公開 seam と Red の固定

- [x] `tests/unit/t416-self-install-allowlist.test.ts` に正本3区分、preserved view、`.gitignore` 期待値、`.gitattributes` 期待値の純関数テストを追加する
- [x] `tests/integration/t416-self-install-gitattributes.integration.test.ts` に `.gitattributes` 実ファイル整合テストを追加する（filesystem test の unit 配置禁止に従う）
- [x] `.gitignore` 期待値は深さ1の再包含と dispatcher の親ディレクトリ再包含を固定し、非 allowlist path が混入しないことを検査する
- [x] 実装前に対象 test を実行し、正本 module 不在による Red を実測する

### Step 2 — 最小の正本実装と import 化

- [x] `SelfInstallAllowlist` 型、正本定数、`preserved`、`gitignoreExpectation`、`gitattributesExpectation` を純関数として実装する
- [x] path は repository 相対・非 glob・NUL/`..`/absolute 禁止とし、tracked と preservedRuntime の重複を fail-fast で拒否する
- [x] 既存 regex 4本を byte 不変で正本へ移し、`scripts/promote-self.ts` と既存 regex test の import 元を正本へ変更する
- [x] promote-self のローカル preserved 配列を削除し、正本由来の preserved view を使用する
- [x] `.gitattributes` に dispatcher の可視化例外を追加し、正本導出結果との実ファイル整合を成立させる

### Step 3 — 落ちる実証と Green 復元

- [x] 正本へ架空 tracked entry を故意に注入し、`.gitattributes` 実ファイル整合 test が Red になることを実測する
- [x] 同じ注入で `.gitignore` 期待集合の固定 test が Red になることを実測する
- [x] 注入を除去し、対象 test を Green に戻す
- [x] `git check-ignore --no-index` により dispatcher の深さ2再包含パターンが positive fixture を復帰させ、negative fixture は ignore のままであることを scratch directory で実測する

### Step 4 — 横断検証と成果物

- [x] 対象 unit test（t416、regex 既存 test、promote-self 関連 test）を実行する
- [x] `bun run lint` と `bun run typecheck` を実行する
- [x] coverage allowlist の `scripts/promote-self.ts` 行ピンを base→head で機械 remap し、reason と現行行の意味を直読照合する。span 膨張なし（2行→2行、1行→1行）
- [x] 日本語 `code-summary.md` に変更、判断、実測、逸脱、u5/u8 引き渡しを記録する
- [x] 実装・テスト・plan・summaryのみを commit 対象とするパス指定 stage 一覧を確定する

## 要件トレーサビリティ

| 要件 | 実装 | 検証 |
|---|---|---|
| FR-5.2 単一正本 | `self-install-allowlist.ts` の3区分、promote-self の import 化 | 正本 catalog / preserved view unit test、regex 既存 test、重複拒否 test |
| FR-5.2 手書きファイル整合・落ちる実証 | `gitattributesExpectation` と `.gitattributes` dispatcher 例外 | 実ファイル突合 test、架空 tracked entry 注入で Red → 除去後 Green |
| FR-5.3 深さ制約 | `gitignoreExpectation` の深さ1否定と dispatcher 親再包含 | 固定期待集合 unit test、scratch 上の `git check-ignore --no-index` positive / negative 実測 |

## Comprehensive test 方針

Test Strategy は Comprehensive。対象は静的データと純関数であり、承認済み NFR に network、service、database、並行プロトコルはないため、負荷試験・DAST・形式検証・E2E は追加しない。

- Happy path: 3区分の全件、preserved union、4 regex の既存挙動、実 `.gitattributes` 一致
- Error / edge: 重複区分、absolute / `..` / glob path 拒否、深さ2 dispatcher の階層再包含、未知 path の非再包含
- Reliability: 正本と `.gitattributes` の差を方向付きで検出し fail loud
- Performance: 数十件の sort / compare のみ。専用負荷試験は NFR 根拠なし。対象 test の通常実行時間を記録する
- Security: path validation の unit test で NUL、absolute、`..`、glob を拒否する。外部入力・credential・network 境界はない

## Test config

- Runtime / runner: Bun 1.3.13、`bun test --timeout 120000 ./<対象ファイル>`（cold timeout 時のみ 120秒で単独再実行）
- Typecheck: `bun run typecheck`（root と tests の strict `tsc --noEmit`）
- Lint: `bun run lint`（Biome、formatter / import organizer 無効）
- Test size: pure / in-memory の unit test は `// size: small`。実 repository file 読取を含む `.gitattributes` 整合は `// size: medium` の integration test に置く
- Isolation: テスト間で共有可変 fixture を持たず、故意注入は作業ツリーへ一時適用して同じ対象 test で Red を実測後、直ちに除去する
