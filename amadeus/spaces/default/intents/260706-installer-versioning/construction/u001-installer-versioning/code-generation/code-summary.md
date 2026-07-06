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

## B002-threeway-backup の変更一覧

| ファイル | 変更 |
|---|---|
| scripts/amadeus-install.ts | assertSafeRelPath（SEC(#543)-2、readInstallManifest 内で全キー検証）、ThreeWayJudge の有効化（trackedWrite 内: グローバル優先規則 → restored / 保守的退避 / 改変退避 / 通常上書き。REL(#543)-2 = backup 先行 + 失敗時 InstallError）、BackupWriter（時刻 dir 遅延作成、`:`→`-`）、judgeObsolete（FR-2.6。removeAbsentFiles と stale skill dir 除去へ結線）、ステップ detail の件数付与（stepCounts）、summary（ヘッダ = 総数 = 列挙数、obsolete 内数行、restored 行） |
| dev-scripts/evals/installer/check.ts | B002 系 35 assertion を先行追加（b/c/d/f/g/h/i/sec-1/AD-6 ×2 シナリオ）。計 340/340 GREEN |
| README.md / README.ja.md | Updating 節へ更新戦略（3-way、退避 dir、--version-info + CI 分岐、bootstrap、既知の限界 = amadeus* 自作 skill）を英日追記（FR-6.1） |
| .gitignore | .amadeus-install.json / .amadeus-install-backup/ を追加（自己導入の誤 commit 防止 = B002 手順 7(i)） |

## B002 の TDD 証跡と設計判断

- RED: B002 assertion 追加直後 7 FAIL + B001 状態での想定 crash（backup dir 不在）を確認。
- GREEN: 実装後 340/340。tsc pass。
- eval 期待側の訂正 1 件: AD-6 の「利用者追加 hook」ケースは merge 結果 = 現状となりグローバル優先規則で skip（退避不要）が正しい挙動。毎回の更新で settings が退避され続ける churn を防ぐ望ましい帰結のため、eval を 2 シナリオ（追加 = 退避なし / wiring 削除 = 退避 + 復元）へ精緻化した。
- 走査除外の確認（B002 手順 7）: rename-leftovers allowlist / lints defaultInclude に新 dotfile への hit なし（grep 0 件）。parity は .agents/ 起点で構造上対象外（§12a infra 実測済み）。

## §12a review（B002、反復 1 → 修正）

- 反復 1 = NOT-READY（高 1 / 低 2）。高 = 廃止ファイル由来の退避件数がステップ行 detail に混入（設計の件数集計ルール違反。eval のカバレッジ外で、reviewer が実機再現で検出）→ TDD で eval assertion を先行追加（RED 確認）→ stepCounts の集計から obsolete 分を除外（GREEN）。低 = removeAbsentFiles の走査順を .sort() で決定論化、security-design のバックスラッシュ記述を実装（安全側で拒否）に合わせて訂正 + eval へ拒否ケース追加。計 342/342 GREEN。
- AD-6 の解釈明記（reviewer 推奨）: 「利用者追加 hook で退避が出ない」のは、書き込み自体が発生しない（merge 結果 = 現状 → グローバル優先規則で skip）ためであり、FR-2 の「無言の上書き禁止」に違反しない — 上書きが存在しないケースである。
