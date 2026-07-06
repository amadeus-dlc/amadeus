# Business Logic Model — full-rename

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更のモデル

実行時ロジックの変更はない（NFR-1: 挙動不変）。変更は名前空間の写像であり、次の 4 面に閉じる。

1. 表記面: `/aidlc` コマンド表記、docs、コメント（実行パスに影響しない）
2. 実体面: workspace ルート `aidlc/`、状態ファイル `aidlc-state.md`、内部マーカー `.aidlc-*`（ファイルシステム実体）
3. 参照面: エンジン定数・hooks・validator・installer・dev-scripts・`.gitignore`・settings 配線（実体を指す文字列）
4. 検査面: nameMappings（パリティ写像）、rename-leftovers allowlist（検出の正）、parity eval C10 pin

## 段階実行計画（FR-10 の具体化）

「各段階で test:all green」と「実体・参照の相互依存」を両立させるため、依存で分割できない移設を 1 つの原子的 commit に集約する 3 段構成とする。

- **Commit A（表記面 + docs）**: `/aidlc` → `/amadeus` の全表記 rename（SKILL prose、runner 生成文、directive メッセージ、hooks 文言、docs、README）と、docs の v2 互換再定義（FR-7）。nameMappings へコマンド表記の写像を同時追加し parity green を維持。実体パスに触れないため test:all green。
- **Commit B（原子的移設）**: 次を 1 commit で行う（分割するとどの順でも中間状態が壊れるため）。
  1. `git mv aidlc amadeus`（record 全件、spaces/memory/knowledge/codekb）
  2. 全 record の `aidlc-state.md` → `amadeus-state.md`、`.aidlc-sensors` 等 → `.amadeus-*` を git mv
  3. エンジン定数（amadeus-lib.ts の workspace root ほか）、hooks、validator、installer MANIFEST、dev-scripts、kanban、`.gitignore`（5 パターン）、settings 配線の参照更新。うち installer は文字列置換で済まない意味論的更新を含む（reviewer F-2）: FR-2.13 の「untouchable ディレクトリ」が aidlc/ → amadeus/ へ変わるため、scripts/amadeus-install.ts の guard ロジック・eval（dev-scripts/evals/installer/check.ts）の fixture セットアップ・検証ラベル・マーカー内容の全件を新前提で再記述する
  4. nameMappings へ実体面の写像（workspace root / 状態ファイル / 内部マーカー）を追加
  5. 各 record の audit へ「移設時点の注記」を新規追記（遡及編集なし、FR-6）
  6. 自 Intent（本 record）の active-intent cursor・移設後 path の整合を同 commit 内で確認
  commit 直前に test:all 全量（engine-e2e / installer / promote 含む）を回して green を確認する。
- **Commit C（検出反転 + 検証強化）**: rename-leftovers eval の allowlist 前提反転（旧名 `aidlc/`・`aidlc-state.md`・`/aidlc`・`.aidlc-*` の残存を検出対象へ。正当な残存 = 上流参照・写像 prefix 側・歴史的記録の言及は reason つき許可）、parity eval C10 の .md ガード pin を新前提へ更新、最終検証の記録。

PR は単一（3 commit を積む）。各 commit で `npm run test:all` green を必須とする。

## 実施順序の制約（phase-check 申し送りの解決）

- (b) 自 worktree の hooks は audit を「active-intent cursor の現在値」へ追記するため、Commit B の作業中に hook が発火すると旧 path へ書き込みうる。対策: Commit B は「git mv → 参照更新 → cursor 検証」を単一の連続作業で行い、mv 直後に hooks の書き込み先（amadeus-lib.ts 経由の path 解決）が新 path を返すことを実測してから commit する。移設中に旧 path へ落ちた hook イベントがあれば新 path の shard へ時系列 union で合流させる（既存の解消規約）。
- (a) 例外維持中のエンジンファイル（写像が効かない 10 件前後）は Commit B の参照更新で手動 rename する。
- 完了済み・並行 Intent の cursor は存在しない（並行ゼロ体制）ため、他 worktree との接触はない。

## 完了条件

受け入れ条件 7 行（requirements.md。FR-9 は該当なしへ補正済み）。gate 承認後に PR 作成、merge 後は全員が新 path 前提で再開する（leader から全員周知を依頼する）。
