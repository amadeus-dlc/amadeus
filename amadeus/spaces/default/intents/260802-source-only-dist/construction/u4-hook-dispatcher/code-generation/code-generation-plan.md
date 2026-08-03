# Code Generation Plan — u4-hook-dispatcher

## 前提と変更範囲

- 対象要件は FR-3.2、C3、ADR-A5、BR-U4-1〜7 とする。user-stories は self-feature スコープで SKIP のため、各手順は requirements と Unit 定義へ追跡する。
- 正本は `packages/framework/harness/claude/` に置き、`dist/` と root の self-install 面は生成コマンドで同期する。生成物は手編集しない。
- `.claude/settings.json` と `.claude/settings.local.json.example` の hook command 集合を機械検査し、現存する11参照を dispatcher 経由へ切り替える。statusLine は対象外とする。
- Unit 指示を NFR 設計の曖昧さより優先し、10実体がすべて不在の fresh clone のみ案内付き exit 0、一部だけ欠落した部分生成は整合エラー exit 1 とする。この差分判断は `code-summary.md` に記録する。

## 実装手順

- [x] Step 1: dispatcher の公開契約を統合テストへ先行実装し、未実装状態で Red を実測する。既知10 slug、11設定参照、未知 slug、全生成 tree 不在、部分欠落、cwd 外実行、child の引数・stdin・stdout/stderr・exit code 伝播を対象とする。— FR-3.2、BR-U4-2〜7、Unit u4
- [x] Step 2: Claude harness 正本へ固定10 slug 表、root 解決、整合検査、実在確認、shell を介さない child 転送を持つ最小 dispatcher を実装する。— FR-3.2、ADR-A5、BR-U4-1〜4、security-design
- [x] Step 3: harness manifest へ dispatcher の投影を追加し、root `.claude/settings.json` の11参照を dispatcher command へ切り替える。settings.local example に直接 hook 参照がないことも契約として固定する。— FR-3.2、BR-U4-5/7
- [x] Step 4: package / self-install の正規生成コマンドで dispatcher を root と配布面へ同期し、生成物を手編集していないことを確認する。— project.md の正本・生成物契約、FR-3.2
- [x] Step 5: focused integration test を Green 化し、JSON 構文、11参照全数、10 slug 全数、全不在 no-op、部分欠落 loud failure、cwd 非依存、child 透過を再実測する。— Comprehensive test strategy、BR-U4-6
- [x] Step 6: `bun run typecheck`、`bun run lint`、関連 hook/settings/package test、`bun scripts/package.ts --check`、`bun run promote:self:check` を実行し、変更範囲の退行がないことを確認する。— project.md Testing Posture
- [x] Step 7: 実測値と設計差分を `code-summary.md` に記録し、全 checkbox を実績と同期する。— Code Generation stage protocol

## 非該当の検証種別

- performance: 常駐サービスではなく固定10要素のローカル CLI であるため負荷試験は追加しない。focused test の timeout と単一 child spawn 契約で退行を検査する。
- 外部 E2E: network・database・外部サービス境界がないため追加しない。実 Bun child を起動する integration test を本 Unit の end-to-end 境界とする。
- security: 専用スキャナは追加せず、未知 slug、root 外 path、shell 非使用、部分欠落 fail-closed を integration test で直接検査する。
