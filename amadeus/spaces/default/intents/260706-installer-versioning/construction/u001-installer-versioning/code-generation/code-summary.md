# Code Summary — u001-installer-versioning（260706-installer-versioning）

上流入力: [code-generation-plan.md](code-generation-plan.md)、[eval-case-design.md](eval-case-design.md)

## B001-manifest-skeleton の変更一覧

| ファイル | 変更 |
|---|---|
| scripts/amadeus-install.ts | manifest 基盤（InstallManifest 型、read/write、sha256）、InstallRecorder（書き込み単一入口 = AD-2）、enumerateDistFiles（statSync 基準 = symlink dir 再帰降下）、removeAbsentFiles（削除パス + 空 dir 除去）、copyEngine / copySkills のファイル単位化（AD-7。cpSync 撤去）、placeAmadeusMd / mergeSettings の trackedWrite 化（変換後 / merge 後 hash = C-7 / AD-6）、resolveSourceCommit（REL(#543)-3）、parseArgs + --version-info、previous install / bootstrap / unknown 告知、smoke 成功後のみの manifest 書き出し（REL(#543)-1） |
| dev-scripts/evals/installer/check.ts | FR543 系 26 assertion（a-1〜a-5 = manifest 生成・内容一致・除外・辞書順・sourceCommit、e-1〜e-4 = version-info 3 系 + previous install 行）を先行追加 |

## TDD 証跡

- RED: assertion 追加直後の実行で FR543 系 15+ 件 fail を確認（既存は GREEN のまま）。
- GREEN: 実装後 300/300（新規 26 + 既存 274）。B001 gate 条件（既存全 GREEN = ファイル単位化の従来互換）を充足。
- tsc --noEmit pass、npm run test:all exit 0（パイプなし）。

## B001 の設計対応

- 判定は凍結（常に上書き / 作成 / 再作成相当）で従来挙動互換。3-way の有効化は B002。
- 退避・告知集計・廃止判定は B002 で載せる（経路 = InstallRecorder / removeAbsentFiles は本 Bolt で一本化済み）。
- BR(#543)-n / REL(#543)-n のコメント名前空間を使用し、既存 BR-n / REL-n コメントは不変。

## §12a review（B001、反復 1 READY）

- 反復 1 = READY。300/300 GREEN・tsc クリーン・設計整合（BR / AD / REL / SEC / mockups 確定文字列の 1 文字単位照合）・B001 凍結の誠実性・assertSafeRelPath の B002 送りの安全性（previous.files 未消費を確認）・mtime 挙動の非回帰、をすべて独立実測で確認。
- Finding 1（Medium、破損 manifest 経路のテストギャップ）は B001 内で即時解消: eval へ 5 assertion 追加（install / version-info とも exit 1 + fix: + ファイル不変）。計 305/305 GREEN。
- Finding 2（Low、--version-info が preflight より先に走る分岐順の UX）は B002 の README 記述時に扱う。Finding 3（skills の二重計上は #451 仕様に忠実な正しい挙動）/ 4（INSTALL_BACKUP_DIR の先行宣言）は記録のみ。
