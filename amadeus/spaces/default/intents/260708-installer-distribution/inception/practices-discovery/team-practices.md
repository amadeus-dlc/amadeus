# Team Practices(差分ドラフト)— installer-distribution

> ステージ: practices-discovery (2.2) / 作成: 2026-07-08
> 部分再実行: team.md は 2026-07-07 affirm 済み。本日の証跡(codekb/installer-distribution/、git 履歴)と一致した Way of Working / Walking Skeleton / Testing Posture は本ドラフトに含めず live ファイルを温存する。差分が出た Deployment / Code Style のみ更新する(promote ツールは draft に存在するセクションだけを replace する)。

## Deployment

デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub 上のタグ/PR 履歴で管理する。GitHub Actions は push と pull_request で typecheck、lint、dist/self-install drift guard、smoke+unit+integration tests を実行し、リリース前には必要に応じて `--release` テスト層を追加する。

リリース(バージョンバンプを含む PR のマージ)時には、CHANGELOG の `## [X.Y.Z]` 見出しと一致する **`vX.Y.Z` git タグを発行する**(当面は手動発行、自動化は将来検討)。タグは t68 が強制する CHANGELOG↔`AMADEUS_VERSION`↔README バッジの3点同期に連なる第4の同期点であり、インストーラ(`@amadeus-dlc/setup`)の配布物取得先として参照される。

## Code Style

TypeScript/ESM と Bun 直接実行を前提に、既存の `amadeus-` プレフィックス、`packages/framework/` 配下のハーネス中立 `core/` とハーネス別 `harness/<name>/` という境界を守る。フォーマッタは無効、lint は Biome、型検査は `tsc --noEmit` の2構成で行い、ツール・フックには実行ビットを要求しない。

新設パッケージ(`packages/*`)は、lint(Biome)と型検査(`tsc --noEmit`)の配線を**パッケージを追加する同一 PR で**追加し、既存の狭い CI lint スコープ(`tests/` のみ)を継承しない。
