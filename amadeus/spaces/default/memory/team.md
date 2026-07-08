# Team-Level Rules

> このチームが承認したプラクティスと是正事項。org.md を上書きする。practices-discovery の承認ゲートで記入される。原則としてゲート経由で編集し、直接編集しない。

## Way of Working

このリポジトリは `main` を中心に、短命ブランチから Pull Request 経由で変更を取り込む GitHub Flow / トランクベース寄りの運用を採用する。実装時は `core/` または `harness/<name>/` を編集元とし、`dist/` とセルフインストールツリーは生成物として `bun scripts/package.ts` と `bun run promote:self` で同期する。

amadeus/ ワークスペース(record: state・per-clone 監査シャード・intents.json、memory、codekb、knowledge)は version-controlled。**チェックポイント(ワークフローのパーク時・ステージ完了時・セッションや1日の終わり)で `amadeus/` ツリーごとコミットする**。監査シャードは per-clone・append-only(`<record>/audit/<host>-<clone>.md`、読み取りは `audit/*.md` の glob マージ)で競合しないため、監査だけの専用コミットは通常不要 — チェックポイントのコミットに自然に含める。

amadeus 実行中に、現在の intent と関連して一緒に扱う必要はあるが、同じ intent に含めると目的や成果物の焦点がぼやける課題を見つけた場合は、発見時点では intent 粒度を気にせず GitHub Issue として起票し、リンクを会話・関連成果物・必要なら stage diary に残してから本線の作業へ戻る。質問の選択肢で非採用にした案や、単にスコープ外と判断しただけの案を機械的に Issue 化しない。

起票済み Issue は、必要に応じて intent 単位になるように親 Issue を追加して整理する。Issue 起票の粒度と intent 設計の粒度を同時に決めようとして、発見時点の記録を遅らせない。

Construction の成果は Bolt ごとに PR/スカッシュマージする。複数ユニット・工程記録の一括反映・無関係なリファクタを単一 PR に束ねない — 束ねると walking-skeleton ゲートと人間レビューの実効性が失われる。工程記録(`amadeus/` ツリー)はチェックポイントごとのコミットで本線へ流し、実装 PR を肥大化させない。

## Walking Skeleton

この intent は既存フレームワークへのインクリメンタルな npm インストーラ実装だが、配布経路がユーザー体験の入口になるため、最初の Construction Bolt は小さな end-to-end スライスとして扱う。最初に最小の `@amadeus-dlc/setup` 実行経路を通し、以後の拡張前に人間がゲートで確認する。

## Testing Posture

テストは TypeScript で `tests/` 配下に追加し、Bun ベースの既存ランナーで検証する。PR/CI の基準は `bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci` で、インストーラ実装では少なくとも CLI 契約・配布物ドリフト・セルフインストール互換をカバーする。

タスク実行中に既存テストが赤い場合、「自分と無関係」を理由に無視して作業を進めたり、スイートをグリーンとして報告・完了扱いしたりしない。まずベースライン(自分の変更前から赤かったか)を確認し、自分の変更で赤くしたテストは必ず直す。変更前から赤い無関係なテストは、原因が明快で安全・低コストに直せるなら同一 PR で直す(ボーイスカウトルール)。直すのが大きい・リスキー・他者の作業中の場合は、黙って進めず GitHub Issue を起票し会話でフラグしてから本線に戻る(Way of Working の Issue 起票ノルムに合流する)。無関係な赤の是正で本線のスコープを不必要に膨張させない。

## Deployment

デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub 上のタグ/PR 履歴で管理する。GitHub Actions は push と pull_request で typecheck、lint、dist/self-install drift guard、smoke+unit+integration tests を実行し、リリース前には必要に応じて `--release` テスト層を追加する。

リリース(バージョンバンプを含む PR のマージ)時には、CHANGELOG の `## [X.Y.Z]` 見出しと一致する **`vX.Y.Z` git タグを発行する**(当面は手動発行、自動化は将来検討)。タグは t68 が強制する CHANGELOG↔`AMADEUS_VERSION`↔README バッジの3点同期に連なる第4の同期点であり、インストーラ(`@amadeus-dlc/setup`)の配布物取得先として参照される。

## Code Style

TypeScript/ESM と Bun 直接実行を前提に、既存の `amadeus-` プレフィックス、`packages/framework/` 配下のハーネス中立 `core/` とハーネス別 `harness/<name>/` という境界を守る。フォーマッタは無効、lint は Biome、型検査は `tsc --noEmit` の2構成で行い、ツール・フックには実行ビットを要求しない。

新設パッケージ(`packages/*`)は、lint(Biome)と型検査(`tsc --noEmit`)の配線を**パッケージを追加する同一 PR で**追加し、既存の狭い CI lint スコープ(`tests/` のみ)を継承しない。
## Forbidden

- NEVER `dist/<harness>/` 配下を手編集する — 生成物であり、`bun scripts/package.ts --check` が CI で失敗する
- NEVER 要求されていない後方互換レイヤー・フォールバック分岐・非推奨API のシム・移行用の二重実装を追加しない。トランクベース開発で互換負債を溜めないため、古い挙動は削除して置き換える。互換維持が必要なときは requirements/NFR に明示された場合にのみ実装し、根拠を成果物に残す
- NEVER 既存テストの赤を「自分と無関係」を理由に無視して作業を続行したり、赤いスイートをグリーン・完了として報告したりしない。まずベースラインを確認し、直す(ボーイスカウト)か Issue 起票でフラグするかのいずれかを必ず行う
- NEVER 検証・ゲート・チェックの結果を実行結果から導出せずに構築しない — status のハードコード、自己参照比較(x === x)、両分岐が同一の条件式、どのコードも消費しない検証用フィールドはすべて「検証劇場」であり、偽の信頼を生む分だけゲート不在より悪い

## Mandated

- ALWAYS `core/` または `harness/<name>/` を編集したら `bun scripts/package.ts` で dist を再生成し、`bun run promote:self` でセルフインストール(`.claude/` / `.codex/` / `.agents/` / `CLAUDE.md`)へ昇格して、両方を同一コミットに含める
- ALWAYS code-generation / functional-design のレビューゲートで、要求にない後方互換レイヤー・フォールバック分岐・移行シム・二重実装が混入していないかを reviewer が明示的に検査する。混入を発見したら、requirements/NFR に根拠が明示されていない限り是正するまでステージを完了させない
- ALWAYS 新設のゲート・検証スクリプト・チェックは、失敗ケースを注入して実際に赤くなることを実証してから完成扱いにする。生成するエビデンス(レポート/アーティファクト)が実行結果由来であること、および保存先まで実際に到達することを確認する。reviewer はコードを読んで承認するだけでなく、この「落ちる実証」を要求する

## Corrections

<!-- 自己学習ループがここに追記する。 -->
- Bolt のレビューが READY になった時点で「Bolt ブランチ切り出し+PR 発行」を明示的にタスク化する。エンジン指令・stage ファイルに現れない Way of Working 規範(Bolt 単位 PR、タグ発行等)は、該当イベント発生時に conductor がタスクリストへ載せて追跡する — 指令駆動ループの外にある規範は、タスク化しない限り実行されない(installer-distribution Bolt 1〜3 で PR 分割漏れを観測、遡及分割で是正) (learned 2026-07-08) <!-- cid:code-generation:code-generation:bolt-pr-taskization -->
