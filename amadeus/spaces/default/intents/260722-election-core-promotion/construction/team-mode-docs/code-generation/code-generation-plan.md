# Code Generation Plan — U5 team-mode-docs

## 前提と境界

- 対象は U5 / C7 のドキュメントのみとし、FR-7a〜7d、FD3 の BR-1〜BR-8、NFR2 の設計を実装へ転写する。コード、型、CLI 挙動、配布生成器、テストコード、memory シードテンプレ、release 資産は変更しない。
- 現物再確認時点で `docs/guide/` の番号付き英日対は `19-plugins.md` / `.ja.md` までであり、次番は設計どおり `20-team-mode.md` / `.ja.md` とする。実装開始時にも再列挙し、並行変更と衝突した場合は未使用の次番へ英日同時に繰り上げる。
- 3層配置規約は新規の巨大文書を作らず、既に「data versus code」「source versus generated distribution」を説明する `docs/harness-engineering/00-overview.md` / `.ja.md` に英日対で追記する。
- U2/U3/U4 および共有 worktree の既存変更は他作業者の所有物として保持し、巻き戻し・整形・便乗修正しない。U2/U3 の着地物は読み取り専用の転記元とする。

## 対象文書

| 操作 | 文書 | 内容 |
|---|---|---|
| 新設 | `docs/guide/20-team-mode.md` / `20-team-mode.ja.md` | 相互 language switch を持つ同一6節の Team Mode 利用者ガイド |
| 追記 | `docs/harness-engineering/00-overview.md` / `00-overview.ja.md` | `scripts/` / `contrib/` / `packages/framework/` の判定規約と昇格作法 |
| 追随 | `docs/guide/team-messaging.md` | 旧 launcher/message パス8件を公開配布パスへ更新し、U3着地後の常時 prerequisite 契約と整合 |
| 追随 | `docs/guide/harnesses/codex-cli.md` / `.ja.md` | 旧 `scripts/team-up.sh` 参照各2件を Codex の公開 self-install パスへ更新 |

## 実装ステップ

- [x] **Step 1: 作業境界とベースラインを固定する。** `git status --short` で共有 U2/U3/U4、監査ログ、ballot 等の既存差分を記録し、対象 docs と本 Unit の plan/summary 以外を変更禁止面にする。`docs/guide` の番号帯、英日 language switch 様式、`docs/harness-engineering/00-overview` の既存構造、`tests/unit/t174-docs-legacy-refs-gate.test.ts` と test-size/config の現状を再確認する。変更前に t174 を実行して件数と結果を記録する。**トレース:** FR-7a〜7d、BR-1、BR-7、Reliability。

- [x] **Step 2: U2/U3 の公開契約を現物から採取する。** `packages/framework/core/tools/team-up.sh`、`team-msg.sh`、`amadeus-election.ts`、`amadeus-utility.ts`、配布 skill、U2/U3 summary とテストを読み、`{{HARNESS_DIR}}/tools/` の公開パス、launcher 引数、message verbs、選挙の `open` / `next` / `vote` / `report` / `status`、doctor の `Team Mode prerequisites:` と found/not-found 行を転記用メモとして固定する。記憶によるコマンド補完はしない。**トレース:** FR-7a、BR-3、Reliability。

- [x] **Step 3: 外部 prerequisite の公式根拠を確定する。** bun は `https://bun.sh`、herdr は `https://herdr.dev`、agmsg は U3 の固定 guidance と同じ `https://github.com/j5ik2o/agmsg` を使用する。公式ページの到達性を追跡付き HTTP 検査で確認し、非公式ミラー・短縮 URL を採用しない。動作確認版として herdr 0.7.1、agmsg 1.1.6を記載し、bun はリポジトリで実際に使用する `bun --version` の実測値を記載する。これらは互換性保証や自動導入ではなく確認済み構成であることを明確にする。**トレース:** FR-7a、FR-7c、BR-2、Security、Reliability。

- [x] **Step 4: 英語版 Team Mode ガイドを同一6節契約で作成する。** `20-team-mode.md` に既存様式の日本語切替リンクを置き、見出しを Overview / Prerequisites / Setup / Running an election / Operating Modes contract / Platform support の6節に限定して作成する。チーム機能がオプトインであること、macOS/Linux 対応、Windows 対象外を Overview と Platform support の双方へ明記する。**トレース:** FR-7a、BR-1、BR-5、Scalability、Reliability。

- [x] **Step 5: Prerequisites 節を実契約に合わせて執筆する。** bun/herdr/agmsg の公式 URL、動作確認版、インストールが利用者責務で Amadeus は入手経路を保証・整備・同梱しないことを記す。PATH 契約は bun/herdr が実行可能であること、agmsg は既定 `$HOME/.agents/skills/agmsg` 配下の実行可能 scripts または公開 override で解決されることとして、U3 source/doctor と矛盾させない。`$amadeus --doctor` の advisory が exit semantics を変えず、found path または固定 guidance を表示することも現物どおり説明する。**トレース:** FR-7a、FR-7c、BR-2、BR-3、Security、Reliability。

- [x] **Step 6: Setup とメッセージ疎通手順を公開配布パスで執筆する。** repository checkout の旧 `scripts/` を案内せず、インストール済み `{{HARNESS_DIR}}/tools/team-up.sh` と `team-msg.sh` を用いる。Claude/Codex の具体例では各 harness の実在ディレクトリへ展開し、doctor確認→チーム起動→send/read の順に、U3 の引数・既定値・出力だけを転記する。環境変数 override は利用者向けに必要な既存契約だけを説明する。**トレース:** FR-7a、BR-3、Reliability。

- [x] **Step 7: 選挙完走手順を配布 skill/CLI の指令転送ループから作る。** 定義 JSON の必要フィールドを示し、`open --file`、`next --election`、指令に応じた `vote --file` または verb、`report --result`、`done` までを順序化する。CLI が判断を要求する `hold` は人間へ委譲し、skill が独自判断しないこと、補助照会は `status` であること、完了後は record path を確認することを明記する。プロトコルを docs 側で再発明しない。**トレース:** FR-7a、BR-3、Reliability。

- [x] **Step 8: Operating Modes contract を要旨として記述する。** `AMADEUS_OPERATING_MODE=team` の判定、solo/team の品質契約が同一であること、team mode が協調実行を選ぶオプトインであることを利用者向けに要約する。`team.md` の規範本文を複製・移動せず、チームの memory 層が規範の正本であることだけを案内する。固有フレーズの長文一致を grep し、複製ゼロを確認する。**トレース:** FR-7a、BR-4、BR-5、Security、Reliability。

- [x] **Step 9: 日本語版を英語版と同じ構造・情報量で作成する。** `20-team-mode.ja.md` に英語版への相互 language switch を置き、6見出し、コードブロック、URL、警告、利用者責務、OS範囲を1対1で対応させる。通常 docs の英語正本と日本語対訳という repository 規約を守り、片言語だけの注記やコマンドを残さない。**トレース:** FR-7a、BR-1、BR-2、BR-5、Reliability。

- [x] **Step 10: 3層配置規約と昇格作法を既存 overview 英日対へ追記する。** 利用者が使う配布機能は `packages/framework/`、repository 開発専用は `scripts/`、ドッグフード専用で dist 非投影は `contrib/` とする判定ルールを記す。昇格時は正本を `git mv`、内部参照を正本相対へ変更、manifest/package/self-install 投影を更新、生成物を再生成、旧正本と旧参照をゼロ化し、P5境界ガードと配布チェックを通す作法を簡潔に追加する。既存の source-versus-dist 説明へ接続し、別の大型文書は作らない。**トレース:** FR-7b、BR-1、BR-6、Security、Reliability。

- [x] **Step 11: 既存3文書の旧 team scripts 参照を全数追随する。** `team-messaging.md` の8件と Codex guide 英日各2件を、文脈に応じて `{{HARNESS_DIR}}/tools/` または `.codex/tools/` の公開パスへ更新する。`team-messaging.md` の「herdr backend は agmsg 不要」という旧説明も、U3 の OS→herdr→agmsg 常時 fail-fast 契約へ合わせる。更新後に docs 全域を検索し、`scripts/team-up.sh`、`scripts/team-msg.sh`、`scripts/team-up-codex-safety-wait.ts` の旧参照が allowlist なしで0件であることを確認する。**トレース:** FR-7a、BR-3、BR-8、Security、Reliability。

- [x] **Step 12: 文書構造・リンク・情報対称性を機械検証する。** t174 を実行して legacy ref、英日リンク先、相互 language switch を検証する。追加したローカル Markdown リンクの実在とアンカー、外部3 URL の到達性、英日両版の6節順序・コードブロック数・必須語彙を検査し、Markdown の表・フェンス・エスケープを目視併用で確認する。新規 test/config は追加せず既存 t174 を再利用し、test-size purity/coverage registry に不要な変更がないことを確認する。**トレース:** FR-7a〜7c、BR-1〜BR-6、BR-8、Security、Reliability。

- [x] **Step 13: 不変面と最終品質を確認する。** `git diff --name-only` で memory シードテンプレ変更0、コード/型/テスト変更0を機械確認する。続いて `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bun tests/gen-coverage-registry.ts --check`、`bash tests/run-tests.sh --ci`、`git diff --check` を実行し、結果と既知の skip/advisory を code summary に記録する。最終差分を新規 Team Mode 英日対、harness overview 英日対、旧参照3文書、本 Unit の plan/summary に限定し、共有 U2/U3/U4 を巻き戻していないことを確認する。**トレース:** FR-7a〜7d、BR-1〜BR-8、全NFR。

## 完了条件

- Team Mode 英日対が相互 language switch と同一6節・同一情報量を持ち、公式 prerequisite 3リンク、確認版、PATH 契約、利用者責務、doctor advisory、setup、メッセージ疎通、選挙完走、Operating Modes 要旨、macOS/Linux 対応・Windows 対象外を含む。
- `docs/harness-engineering/00-overview.md` / `.ja.md` に3層判定規約と昇格作法が簡潔に加わり、新規の巨大文書が増えていない。
- docs 全域の旧 team scripts 参照が0件で、t174、Markdown/リンク検査、全 repository 品質ゲートが green である。
- memory シードテンプレ、production code、test/config、共有 U2/U3/U4 の既存変更に本 Unit 由来の差分がない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T11:41:26Z
- **Iteration:** 1
- **Scope decision:** none

FR-7a〜7dとBR-1〜8を満たし、英日6節対、公式URL、公開配布パス、選挙完走手順、Operating Modes要旨、3層規約、旧参照0件、templates・code・tests不変および全検証greenの証拠が整合している。

### Findings

- None
