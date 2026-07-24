# Code Summary — fix-1449-watcher-timeout(Issue #1449)

上流入力(consumes 全数): inception/requirements-analysis/requirements.md(実在)。設計系 consumes(functional-design / nfr-* / infrastructure-design / units-generation)は bugfix スコープで SKIP。本 bugfix は requirements.md と codekb から直接スコープした(degraded input を明記)。

## 変更概要

選挙 E-WTFRA1(=C案)裁定に従い、`verify_watchers_armed` の agmsg watcher readiness 再送予算(既定)を **2→1** に縮小。worst-case ブロッキングを **270秒(3ラウンド)→180秒(2ラウンド)** へ確定した。agmsg `spawn.sh`(単発待ち)と対称な「単発待ち→1回再送→再度待ち」構造となり、#1384(TUI cold-start prompt 脱落)の回復力(最低1回の再送)を保持する。

## 作成・変更ファイル

### 正本(canonical)
- `packages/framework/core/tools/team-up.sh`
  - `WATCHER_RESEND_MAX="${WATCHER_RESEND_MAX:-2}"` → `"${WATCHER_RESEND_MAX:-1}"`(:114)
  - 定数ブロック(:95-113)+ `verify_watchers_armed` ヘッダコメント(:1142-1152)を 2ラウンド/180秒の根拠へ更新
  - ※本変更は wip コミット `9b851c5ae`(RA承認済み、code-generation 進行中に着手)で適用済み・HEAD(`3308385c6`)に含まれる。ループ本体・exit code 分岐・`mux_attach` 前検証順序・リカバリガイダンス出力は無改修

### テスト
- `tests/integration/t-team-up-watcher-arming.test.ts`
  - ヘルパー追加: `envSansBudget`(WATCHER_* 上書き除去で canonical 既定を解決)、`countOccurrences`
  - describe「team-up watcher arming — Issue #1449 re-send budget」を新設(4テスト):
    - NFR-1c: `WATCHER_READY_TIMEOUT` 既定 = 90(軽量定数 assert)
    - NFR-1a: `WATCHER_RESEND_MAX` 既定 = 1(落ちる実証の注入面)
    - NFR-1a: never-arm 時の再送ラウンド数 = 1(send-text が各メンバー1回)
    - NFR-1b: 再送1回設定でも member が回復して緑(#1384 回復力の保持)

### 配布物(生成物、正本から機械再生成)
- `dist/{claude,codex,cursor,kiro,kiro-ide,opencode}/**/tools/team-up.sh`(6面、`bun scripts/package.ts`)
- self-install: `.claude/tools/team-up.sh`, `.codex/tools/team-up.sh`, `.cursor/tools/team-up.sh`, `.opencode/tools/team-up.sh`(4面、`bun run promote:self`)

## 主要な実装判断

- **既定定数1点のみの外科的変更**: requirements 未解決事項の「`WATCHER_RESEND_MAX` を 2→1 にするか、ループ構造を撤去して固定1回再送にするか」の判断は、**既定値を 2→1 にする**(ループ構造は保持)を選択。NFR-2(90秒接地維持)・NFR-1b(再送1回での回復力保持)を満たしつつ、env オーバーライドによるタイミング検証シームも保持できるため。要求されていない後方互換シム・移行分岐は追加しない(古い 3ラウンド挙動は削除して置換)。
- **落ちる実証の注入面**: 比較型ゲートでないため、テストが実際に読む canonical `team-up.sh` の既定定数に注入(NFR-1a)。dist は生成物でテストは読まないため注入対象外。

## テストカバレッジ

- 対象 integration test: **11 pass / 0 fail / 47 expect**(既存7 + 新規4)。
- 落ちる実証: pre-fix(既定2)で NFR-1a 2件が赤 → fix 復元で 11/11 緑。RED→GREEN を1セットで実測、canonical に残留注入なし。

## 検証(全て実測 exit 0)

| コマンド | 結果 |
|----------|------|
| `bun run typecheck` | exit 0 |
| `bun run lint`(Biome) | exit 0(変更ファイル単体で新規 warning 0) |
| `bun run dist:check` | exit 0(全ハーネス in sync) |
| `bun run promote:self:check` | exit 0(self-install in sync) |
| `bun test tests/integration/t-team-up-watcher-arming.test.ts` | 11 pass / 0 fail |

## プランからの逸脱

なし。Step 1(中核修正)は RA 承認済みの wip コミットで先行適用されており、本ステージでは残作業(テスト・落ちる実証・dist 同期・検証)を完遂した。

## 要件充足

- FR-1 / AC-1a: worst-case 270→180秒(2ラウンド) ✓
- AC-1b / NFR-2: `WATCHER_READY_TIMEOUT=90` 接地維持 ✓
- AC-1c / FR-3 / FR-4: exit code 契約・`mux_attach` 前検証順序・no-silent-success・リカバリガイダンス保持 ✓
- FR-2: 正常系コスト維持(ループ本体無改修、armed メンバーは即 skip) ✓
- NFR-1a: 落ちる実証(RED→GREEN)✓ / NFR-1b: 再送1回での回復力テスト緑 ✓ / NFR-1c: 既定90の定数 assert ✓
