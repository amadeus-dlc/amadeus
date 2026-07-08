# Discovered Rules — installer-distribution

> ステージ: practices-discovery (2.2) / 作成: 2026-07-08
> 出典: `practices-discovery-questions.md` Q1・Q2(ユーザーが表明したハード制約のみをルール化)

## Mandated

- ALWAYS リリース(バージョンバンプを含む PR のマージ)時に、CHANGELOG の `## [X.Y.Z]` 見出しと一致する `vX.Y.Z` git タグを発行する(当面手動。インストーラの配布物取得先)
- ALWAYS 新設パッケージ(`packages/*`)は lint(Biome)と型検査(`tsc --noEmit`)の配線をパッケージ追加と同一 PR で加え、既存の狭い CI lint スコープ(`tests/` のみ)を継承しない

## Forbidden
