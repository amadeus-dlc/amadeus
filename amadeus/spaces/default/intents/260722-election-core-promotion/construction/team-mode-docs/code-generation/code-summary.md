# Code Summary — U5 team-mode-docs

## 実装結果

- `docs/guide/20-team-mode.md` / `.ja.md` を新設した。英日とも同じ6節、相互 language switch、同じ表・コマンド・選挙手順・platform範囲を持つ。
- prerequisite は U2/U3 の着地コードと doctor 出力から転記し、bun 1.3.13、herdr 0.7.1、agmsg 1.1.6、公式入手先、解決契約、利用者責務を記載した。
- Setup はインストール済み `{{HARNESS_DIR}}/tools/`、Codex 固有箇所は `.codex/tools/` を使用し、repository checkout の旧 team scripts を案内しない。
- 選挙は配布 skill の directive loop に従い、`open` → `next` → `vote` / 指定 verb → `report` → `done` と、人間判断が必要な `hold` を説明した。
- Operating Modes は利用者向け要旨に限定し、チームの `memory/team.md` を規範の正本として案内した。規範本文の複製・移動は行っていない。
- `docs/harness-engineering/00-overview.md` / `.ja.md` に3層配置規約と昇格作法を簡潔に追記した。新規の大型 harness 文書は作成していない。
- 既存3文書にあった旧 team scripts 参照12件を全数追随し、docs 全域の旧参照を0件にした。`team-messaging.md` の「herdr backend なら agmsg 不要」という旧説明も、U3 の常時 fail-fast 契約へ合わせた。

## 作成・更新ファイル

- 新規: `docs/guide/20-team-mode.md`
- 新規: `docs/guide/20-team-mode.ja.md`
- 更新: `docs/harness-engineering/00-overview.md`
- 更新: `docs/harness-engineering/00-overview.ja.md`
- 更新: `docs/guide/team-messaging.md`
- 更新: `docs/guide/harnesses/codex-cli.md`
- 更新: `docs/guide/harnesses/codex-cli.ja.md`
- 記録: `construction/team-mode-docs/code-generation/code-generation-plan.md`
- 記録: `construction/team-mode-docs/code-generation/code-summary.md`

## 現物根拠

- ガイド番号帯は実装時に再列挙し、`19-plugins.md` / `.ja.md` が最新だったため次番20を使用した。
- doctor の実出力は `Team Mode prerequisites:` 以下の
  `<tool>: <resolved-path>` または `<tool>: not found (<fixed guidance>)`。
- 公式 URL は 2026-07-23 に追跡付きHTTP確認を行い、`https://bun.sh`、
  `https://herdr.dev`、`https://github.com/j5ik2o/agmsg` がすべてHTTP 200だった。
- 実環境の動作確認版は bun 1.3.13、herdr 0.7.1、agmsg 1.1.6。

## 検証結果

| 検証 | 結果 |
|---|---|
| t174 docs gate | 5 pass / 0 fail |
| 英日構造 | 各H2 6節、各fence 14、相互 language switch |
| 追加ローカルリンク/anchor | PASS |
| 公式外部URL | 3件ともHTTP 200 |
| 旧 team scripts 参照 | docs全域0件 |
| team.md 規範本文の逐語複製 | 0件 |
| `bun run typecheck` | PASS |
| `bun run lint` | exit 0、既存 complexity warning 251件 |
| `bun run dist:check` | 6 harness PASS |
| `bun run promote:self:check` | 4 self-install面 PASS |
| coverage registry check | fresh / guards green / ratchet held |
| `bash tests/run-tests.sh --ci` | 476 files、6801 assertions、0 failed files、0 failed assertions |
| `git diff --check` | PASS |

全CIでは invalid/expired AWS credentials により live SDK/substrate がskipされ、
Claude substrate unavailable の derived live tests もskipされた。wall-clock advisory は
`t-codex-hooks-migration` と `t225-upstream-v2-migration-preflight` の2件だった。

## 逸脱と切り分け

- 全CIを誤って同時に2走させた際、共有fixtureを使う `t120-classify-roundtrip` が
  1件失敗した。当該テストを単独再実行すると16/16 passで、他のCI processをすべて
  終了させた後の単一full CIは476/6801で全件passしたため、重複走行の干渉と判定した。
- 既存 `docs/harness-engineering/00-overview.ja.md` には今回追加していない
  reference anchor の不整合が1件ある。本 Unit の追加リンクと t174 対象には不整合が
  なく、surgical change の境界を守って修正していない。

## 差分監査

- U5由来の差分は新規Team Mode英日対、harness overview英日対、旧参照3文書、
  plan/summaryだけ。
- memoryシードテンプレ、production code、tests、test config、coverage metadata、
  release資産へのU5由来変更は0件。
- 共有U2/U3/U4、監査ログ、ballot、他Unitの既存変更を巻き戻していない。

## Next Steps

- quality review で FR-7a〜7d、BR-1〜BR-8、英日情報対称性と公開コマンド転記を確認する。
- Unit境界で親agentがユーザー指示どおりrebaseを実施する。
