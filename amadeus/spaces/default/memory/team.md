# Team-Level Rules

> このチームが承認したプラクティスと是正事項。org.md を上書きする。practices-discovery の承認ゲートで記入される。原則としてゲート経由で編集し、直接編集しない。

## Way of Working

このリポジトリは `main` を中心に、短命ブランチから Pull Request 経由で変更を取り込む GitHub Flow / トランクベース寄りの運用を採用する。インストーラ実装では段階的な workspace 化を選び、`packages/setup/` に `@amadeus-dlc/setup` を追加する一方で、既存の `core/` / `harness/` / `dist/` / `scripts/` の全面移動は別 refactor として扱う。

amadeus/ ワークスペース(record: state・per-clone 監査シャード・intents.json、memory、codekb、knowledge)は version-controlled。**チェックポイント(ワークフローのパーク時・ステージ完了時・セッションや1日の終わり)で `amadeus/` ツリーごとコミットする**。監査シャードは per-clone・append-only(`<record>/audit/<host>-<clone>.md`、読み取りは `audit/*.md` の glob マージ)で競合しないため、監査だけの専用コミットは通常不要 — チェックポイントのコミットに自然に含める。

amadeus 実行中に、現在の intent と関連して一緒に扱う必要はあるが、同じ intent に含めると目的や成果物の焦点がぼやける課題を見つけた場合は、発見時点では intent 粒度を気にせず GitHub Issue として起票し、リンクを会話・関連成果物・必要なら stage diary に残してから本線の作業へ戻る。質問の選択肢で非採用にした案や、単にスコープ外と判断しただけの案を機械的に Issue 化しない。

起票済み Issue は、必要に応じて intent 単位になるように親 Issue を追加して整理する。Issue 起票の粒度と intent 設計の粒度を同時に決めようとして、発見時点の記録を遅らせない。

## Walking Skeleton

この intent は既存フレームワークへのインクリメンタルな npm インストーラ実装だが、配布経路がユーザー体験の入口になるため、最初の Construction Bolt は小さな end-to-end スライスとして扱う。最初に最小の `amadeus-setup` 実行経路を通し、以後の拡張前に人間がゲートで確認する。

## Testing Posture

テストは TypeScript で `tests/` 配下に追加し、Bun ベースの既存ランナーで検証する。インストーラ実装では line coverage しきい値ではなく `covers:` registry と ratchet を品質床にし、CI で registry freshness/ratchet、installer smoke/unit/integration、typecheck、lint、dist/self-install drift guard を blocking gate とする。

## Deployment

デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub tag/Release を中心に扱う。PR CI は merge gate とし、production release は GitHub Actions の `workflow_dispatch` で人間がボタン実行し、通常は最新 stable tag から release/publish する。

## Code Style

TypeScript/ESM と Bun 直接実行を前提に、既存の `amadeus-` プレフィックス、ハーネス中立の `core/`、ハーネス別の `harness/<name>/` という境界を守る。`amadeus-setup` は人間が terminal で使う入口なので、ユーザー向けには human-readable stderr を基本とし、内部は structured result、非対話の競合は explicit force/backup policy なしでは fail させる。
## Forbidden

- NEVER `dist/<harness>/` 配下を手編集する — 生成物であり、`bun scripts/package.ts --check` が CI で失敗する

## Mandated

- ALWAYS `core/` または `harness/<name>/` を編集したら `bun scripts/package.ts` で dist を再生成し、`bun run promote:self` でセルフインストール(`.claude/` / `.codex/` / `.agents/` / `CLAUDE.md`)へ昇格して、両方を同一コミットに含める

## Corrections

<!-- 自己学習ループがここに追記する。 -->
