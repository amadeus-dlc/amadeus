# code-generation memory (260810-plugin-manifest-resoluti / fix-2823-plugin-manifest-resolution)

## Interpretations

- 2026-08-10T11:25:00Z — walking-skeleton stance は off(project.md → org.md の scope rule: 既存コードへの限定修正は skeleton ceremony skip)と分類し report 済み
- 2026-08-10T11:25:00Z — unit 名は `fix-2823-plugin-manifest-resolution`。self-fix は units-generation を SKIP するため engine 指示どおり unit ディレクトリを手動作成
- 2026-08-10T11:25:00Z — loud 化チャネルは stderr 警告に確定(reviewer NIT「1 つに確定せよ」反映)。argv 区別規則は「相対かつ path separator を含む要素」(同 FOLLOW-UP 反映)

## Deviations

- 2026-08-10T11:25:00Z — Step 3 の計画承認ゲートは autonomy=full グラント(intent-grant-3f36d239bbdc1e61e34fe015614c8127、question/stage-gate を含む)の記録済み宣言として自動承認し、人間への提示を省略

## Tradeoffs

- 2026-08-10T11:45:00Z — linter sensor の 8 fire は全件「repo 全体の max-diagnostics 截断 artifact」(既存 complexity warning 群による pseudo-error)であり、本変更由来の診断は 0(biome 新旧比較で choice.ts の complexity warning は HEAD 時点でも 6 件で不変と実測)。AGENTS.md 記載の期待ベースラインどおり

## Open questions

- 2026-08-10T11:45:00Z — reviewer FOLLOW-UP: FR-7 の failing-first 赤 half は build-and-test で `git stash` 等により捕捉する。declaredFormalCheckArgv の formalCheck argv 非 join は同クラス潜伏としてフォローアップ起票候補
