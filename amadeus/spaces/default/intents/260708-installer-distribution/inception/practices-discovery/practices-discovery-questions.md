# Practices Discovery — 質問と回答

- **Intent**: 260708-installer-distribution
- **ステージ**: practices-discovery (2.2)
- **モード**: Grill me(グリリング — 質問は動的に1問ずつ追記される)
- **前提**: team.md は 2026-07-07 に affirm 済み(installer intent 文脈込み)。本日の RE codekb を証跡とし、差分ギャップのみ質問する

> このファイルは意思決定の正式記録。

---

## Q1. リリースタグ規約の新設(Deployment プラクティスの差分)

証跡: team.md の Deployment は「リリースは npm パッケージ配布と GitHub 上のタグ/PR 履歴で管理する」と規定するが、本日の RE スキャンで **git タグが0件**であることが確定した(バージョンは CHANGELOG 見出し+`AMADEUS_VERSION` 定数のみで管理され、VCS タグとして発行されたことがない)。インストーラの「GitHub タグ指定アーカイブ取得」はタグの実在に依存する。

プラクティスとして「リリース(バージョンバンプを含む PR のマージ)時に CHANGELOG 見出しと一致する `vX.Y.Z` git タグを発行する」を新設するか?

- A. 新設 — `vX.Y.Z` タグをリリース時に発行する規約を Deployment に追記する(推奨: t68 が保証する CHANGELOG↔定数↔バッジの3点同期に第4の同期先としてタグが加わり、インストーラの取得先が確定する。発行は当面手動、自動化は将来)
- B. 新設+GitHub Releases も併用 — タグに加えて Release ノートも発行する(運用負荷増)
- C. 規約化しない — タグの扱いは requirements-analysis の設計判断に委ねる(プラクティス層には書かない)
- X. Other(自由記述)

[Answer]: A. 新設 — リリース時に CHANGELOG 見出しと一致する `vX.Y.Z` git タグを発行する規約を Deployment に追記(当面手動、自動化は将来)(2026-07-08、Mode: grilling)

---

## Q2. 新設パッケージの lint / 型検査配線(Code Style プラクティスの差分)

証跡: team.md の Code Style は「lint は Biome、型検査は `tsc --noEmit` の2構成」と規定するが、本日の RE で **CI の lint 実行は `bunx @biomejs/biome check tests/` のみ**(`packages/framework/`・`scripts/` は型検査のみで biome 対象外)であることが確定した(既存負債)。`packages/setup` は新規パッケージであり、暗黙にはどちらの検査にも入らない。

プラクティスとして「新設パッケージは lint(Biome)と型検査(tsc)の配線を同一 PR で追加し、既存の狭い lint スコープを継承しない」を新設するか?

- A. 新設 — 新規パッケージの検査配線必須を Code Style に追記する(推奨: 検証劇場禁止・落ちる実証の既存ルールと整合し、setup パッケージが負債を継承するのを防ぐ)
- B. 新設+既存負債も解消 — 併せて `packages/framework`・`scripts/` も biome 対象に広げる(本 intent のスコープ膨張リスク — Issue 起票が適切かも)
- C. 規約化しない — setup の配線は実装判断に委ねる
- X. Other(自由記述)

[Answer]: A. 新設 — 新規パッケージは lint(Biome)+型検査(tsc)の配線を同一 PR で追加し、狭い既存スコープを継承しない規約を Code Style に追記(2026-07-08、Mode: grilling)
