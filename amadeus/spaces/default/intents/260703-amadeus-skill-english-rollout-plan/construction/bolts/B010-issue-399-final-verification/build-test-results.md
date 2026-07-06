# Build Test Results：B010 #399 最終検証

## 実行結果（2026-07-03T16:11Z 時点）

| コマンド | 結果 | メモ |
|---|---|---|
| `npm run test:all` | pass | typecheck、lint、contract check、Claude host wiring、integration eval、mock e2e、example validation、diff check が pass した。 |
| `npm run validate:all` | pass | 段階別 example snapshot の workspace と Intent の構造検証が pass した。 |
| `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan` | pass | 判定 pass。不足または矛盾なし。 |
| `git diff --check` | pass | whitespace error なし。 |
| 日本語残存 grep（64 ファイル） | pass | 残存は許容対象のみ。見出しレベルの日本語は埋め込みテンプレート（`# Grillings`、`# Amadeus Validator 結果`）と `未確認` を含む見出しに限られる。 |
| source と昇格先の diff（32 skill） | pass | diff ゼロ。 |

## 補足

`test:examples` の stale (許容) ログは、provenance staleReason による許容であり failure ではない。real provider 再生成は後続 PR で実施する。
