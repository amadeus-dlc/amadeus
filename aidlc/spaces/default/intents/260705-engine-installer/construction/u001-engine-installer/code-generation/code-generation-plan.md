# コード生成計画 — unit: u001-engine-installer（Bolt B001 + B002）

上流入力は [business-logic-model.md](../functional-design/business-logic-model.md)（BR-1..BR-15 は [business-rules.md](../functional-design/business-rules.md)）、[reliability-design.md](../nfr-design/reliability-design.md)、[mockups.md](../../../inception/refined-mockups/mockups.md)・[interaction-spec.md](../../../inception/refined-mockups/interaction-spec.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[bolt-plan.md](../../../inception/delivery-planning/bolt-plan.md) である。設計は確定済みとして扱い、再導出は行わなかった。

Bolt B001（walking skeleton）の範囲は、マニフェスト + CLI + 5 工程の正常系 + eval 骨格（FR-2.1〜2.5、FR-2.8）である。異常系の専用 eval（FR-2.6/2.7/2.9〜2.13）、README（FR-3.1）、FR-4.1 の専用 eval 項目は B002 に割り当てた（下記「Bolt B002（hardening）」節で完了報告する）。

## トレーサビリティ

| Step | 対応要求・設計 | 対象 |
|---|---|---|
| Step 1 | 前提調査（reverse engineering） | 配布元実レイアウト（.agents/amadeus/、.claude symlink、settings.json hooks、AMADEUS.md 行番号）を実測し、business-logic-model.md の記述と一致することを確認 |
| Step 2 | 前提調査（doctor 依存） | `bun .agents/amadeus/tools/amadeus-utility.ts doctor` の実装を読み、smoke（O-2）が fresh target で pass する条件（`aidlc/spaces/default/memory/` の事前存在）を特定 |
| Step 3 | NFR-1、DR-1（TDD） | `dev-scripts/evals/installer/check.ts` を先に書く |
| Step 4 | NFR-1（RED 確認） | インストーラ不在の状態で eval を実行し FAIL することを確認 |
| Step 5 | FR-1.1〜FR-1.11、BR-1〜BR-15 | `scripts/amadeus-install.ts` を実装（MANIFEST、preflight、copyEngine、copySkills、transformAmadeusMd、placeAmadeusMd、relinkClaude、mergeSettings、smoke、CLI） |
| Step 6 | FR-1.11、FR-2.4、CON-8 | `package.json` に `amadeus:install`・`test:it:installer` を追加し、`test:it:all` へ連鎖 |
| Step 7 | NFR-1（GREEN 確認） | eval を再実行し全 assertion pass を確認 |
| Step 8 | 型安全性（team.md 開発標準） | `scripts/**/*.ts` を `tsconfig.json` の `include` に追加し `npx tsc --noEmit` を通す |
| Step 9 | （stage 成果物契約） | 本 plan と code-summary.md |

## 実行ステップ

- [x] **Step 1: 実レイアウトの実測** — `.agents/amadeus/` 7 dir、`.claude/{7 name}` の相対 symlink（`../.agents/amadeus/<name>`）、`.claude/settings.json` の hooks 配線（amadeus-*.ts 参照 11 entry、kanban-local 3 entry は対象外）、`AMADEUS.md`（103 行）中の除去対象 2 層（H2「Development Rules」、宣言的ブロック 4 件）の行位置を実測し、business-logic-model.md の記述（行番号含む）と完全一致することを確認した。
- [x] **Step 2: doctor smoke の事前条件調査** — `amadeus-utility.ts` の `handleDoctor` を読み、「workspace shell ready」検査が `harnessEngineDir`（`.claude/`）と `memoryDirFor(projectDir, "default")`（`aidlc/spaces/default/memory/`）の両方の存在を要求することを確認した。インストーラは `aidlc/` に一切書き込まない契約（BR-1）のため、eval の fixture 側で `aidlc/spaces/default/memory/` を事前に用意する（「既にシェルが導入済みの workspace へインストーラを実行する」という実運用を模する）必要があると判断した。
- [x] **Step 3: eval 骨格を先に作成** — `dev-scripts/evals/installer/check.ts` を実装。FR-2.5（マニフェストと配布元実レイアウトの一致、AMADEUS.md 除去対象の正方向存在）、FR-2.1（実インストール + 5 工程マーカー + smoke pass）、レイアウト検査（7 engine dir、amadeus* skills 2 系統、7 symlink、AMADEUS.md 負方向検査、settings.json 11 entry）、FR-2.2（cold-cache module load）、FR-2.3（冪等再実行）、FR-2.8（temp dir 片付け）を検証する。
- [x] **Step 4: RED 確認** — `scripts/amadeus-install.ts` を一時的に退避し `bun run dev-scripts/evals/installer/check.ts` を実行、`error: Cannot find module '../../../scripts/amadeus-install.ts'` で exit 1 になることを確認した（下記「RED 証跡」）。
- [x] **Step 5: インストーラ本体を実装** — `scripts/amadeus-install.ts` に MANIFEST（engineDirs 7、skillsGlobPrefix、claudeSymlinks 7、amadeusMd.removeSections/removeBlocks/devReferencePatterns、hooksWiring 11 entry）と、`preflight`・`copyEngine`・`copySkills`・`transformAmadeusMd`・`placeAmadeusMd`・`relinkClaude`・`mergeSettings`・`smoke` の各関数、5 工程 CLI を実装した。
- [x] **Step 6: package.json 追記** — `amadeus:install`、`test:it:installer` を追加し、`test:it:all` チェーン末尾に `test:it:installer` を追記（既存順序を保ったまま追記型）。
- [x] **Step 7: GREEN 確認** — 退避した実装を復元し `bun run dev-scripts/evals/installer/check.ts` を再実行、全 assertion pass（`installer eval: ok`、exit 0）を確認した。
- [x] **Step 8: 型検査** — `tsconfig.json` の `include` に `scripts/**/*.ts` を追記し、`npx tsc --noEmit` を実行、エラー 0 件を確認した（2 件の型エラーを修正: eval 側の `.ts` 拡張子付き import を拡張子なしへ、`mergeSettings` の `Set` を `Set<string>` へ明示）。
- [x] **Step 9: 本ドキュメント一式** — 本 plan と `code-summary.md` を作成。

## RED 証跡（Step 4）

```
$ mv scripts/amadeus-install.ts scripts/amadeus-install.ts.bak
$ bun run dev-scripts/evals/installer/check.ts
error: Cannot find module '../../../scripts/amadeus-install.ts' from
'.../dev-scripts/evals/installer/check.ts'
(exit 1)
```

復元後、同じコマンドで `installer eval: ok`（exit 0）に変わることを確認した（GREEN、下記 code-summary.md「検証結果」参照）。

## 設計からの逸脱と判断（investigate、blind whitelist はしない）

FR-2.2（cold-cache module load 検証）の実装方法を、依頼テキストが示唆した「`bun -e "await import(...)"`」から「`bun build --target=bun <file> --outfile <tmp>`」へ変更した。理由は次のとおり実測で確認した。

- `.agents/amadeus/tools/` の一部ファイル（`amadeus-sensor.ts`、`amadeus-sensor-required-sections.ts`、`amadeus-sensor-upstream-coverage.ts`、`amadeus-swarm.ts`、`amadeus-validate.ts`）は `if (import.meta.main)` ガードを持たず、モジュール末尾で `main()` を無条件に呼ぶ。これらを `bun -e "await import(...)"` で駆動すると、`process.argv` が空のため「サブコマンド必須」の正当な usage エラーで exit 1 になる（直接 `bun <file>` を引数なしで実行した場合と同じ挙動であることを実測で確認済み）。これは「オフライン/cold cache でのモジュール読み込み失敗」ではなく、CLI 引数不足という無関係な理由での false negative である。
- 一方 `bun build --target=bun <file> --outfile <tmp>` は、対象ファイルとその import グラフの解決だけを行い（モジュールコードは一切実行しない）、実測で本リポジトリの tools 26 件 + hooks 11 件すべてが exit 0 で解決できることを確認した。意図的に壊れた import（存在しないファイル）を仕込んだ最小再現でも `error: Could not resolve: "..."` を検出できることを確認済みであり、FR-2.2 が本来検証したい「コピー後のオフライン workspace で、依存ファイル欠落により読み込みが壊れていないか」を、CLI 引数の有無に依存せず一様な方法ですべてのファイルへ適用できる。
- `bun build --no-bundle`（依頼テキストが最初に検討し却下した案）は transpile のみで import 解決を行わないため、壊れた import を検出できないことも実測で確認し、不採用とした。

この変更により、eval は tools/hooks の実行時 CLI セマンティクスに依存せず、「配布先で全ファイルの依存が解決できるか」という FR-2.2 の本来の関心を、ガード有無の異なる混在コードベースに対して均一な方法で検証できる。

## Bolt B002（hardening）

範囲は FR-2.6〜FR-2.7、FR-2.9〜FR-2.13、FR-3.1、FR-4.1 である。`scripts/amadeus-install.ts` の異常系実装自体は B001 の時点で完成済み（依頼テキストの前提どおり）であり、本 Bolt は「専用 eval fixture を追加し、実際に検証する」ことが主作業である。

### トレーサビリティ（追加分）

| Step | 対応要求・設計 | 対象 |
|---|---|---|
| Step 10 | FR-2.6（正方向 throw + 連続空行圧縮） | `transformAmadeusMd` を合成 source（宣言対象を 1 つずつ欠落させた variant）で検査 |
| Step 11 | FR-2.7（settings マージの実ファイル駆動検証） | 既存 `env`・`permissions`・同一 matcher の利用者 hooks ブロックを持つ fixture |
| Step 12 | FR-2.9（非破壊中断） | (a) `.claude/agents` 位置の実体ディレクトリ衝突、(b) 解析不能 `settings.json` の 2 fixture |
| Step 13 | FR-2.10（事前チェック 3 パターン） | target 不在・非ディレクトリ・書き込み不可（chmod 000） |
| Step 14 | FR-2.11（非対象 skills 不変） | `.claude/skills/`・`.agents/skills/` に非 amadeus skill を持つ fixture |
| Step 15 | FR-2.12（スモーク偽陽性回帰） | `smoke()` の呼び出し形（`--project-dir` + `cwd=target`）を eval 側でミラーし直接駆動 |
| Step 16 | FR-2.13（aidlc/ 不可侵） | 既存 eval の workspace seed に marker file を追加し、2 回インストール後もバイト単位・mtime 単位で不変であることを検査 |
| Step 17 | FR-4.1（Codex `.agents/` 完全性） | `.agents/amadeus/*`・`.agents/skills/amadeus*` 配下に symlink が存在しないことを再帰検査 |
| Step 18 | FR-3.1（README） | README.md（英語）・README.ja.md（日本語）へ導入手順節を追加 |
| Step 19 | NFR-1（TDD の RED→GREEN 記録）、型安全性、lint | eval 全体・`tsc --noEmit`・`lints/check.ts --check` を実行し記録 |

### 実行ステップ

- [x] **Step 10〜17: 新規 assertion の追加** — `dev-scripts/evals/installer/check.ts` に 9 系統・148 件の新規 assertion を追加した（内訳は code-summary.md「新規 eval 一覧（B002）」参照）。
- [x] **Step 18: README 追記** — README.md に `## Install into a Workspace`、README.ja.md に `## 利用者向け導入手順` を追加した（導入コマンド、インストール内容、post-install 検証、更新規約、Bun 前提）。
- [x] **Step 19: 検証** — `bun run dev-scripts/evals/installer/check.ts`（261 assertion、0 failure、exit 0）、`npx tsc --noEmit`（エラー 0 件）、`bun run lints/check.ts --check`（0 violations）を確認した。

### RED 証跡（Step 10〜17 追加直後、Step 18 の前）

新規 assertion を追加した直後（README 追記前）に実行し、次の 2 件だけが FAIL することを確認した。他の新規 assertion（FR-2.6、FR-2.7、FR-2.9、FR-2.10、FR-2.11、FR-2.12、FR-2.13、FR-4.1 に対応するもの）は、B001 で実装済みの異常系ロジックが最初から満たしていたため、追加直後から GREEN であった（gap は README のみ）。

```
$ bun run dev-scripts/evals/installer/check.ts
...
FAIL: FR-3.1 README.md documents the installer command, doctor verification, and re-run-to-update
FAIL: FR-3.1 README.ja.md documents the installer command, doctor verification, and re-run-to-update
installer eval: 2 failure(s)
(exit 1, 259 ok / 2 FAIL)
```

README.md・README.ja.md へ節を追加した後に再実行し、GREEN（261 assertion、0 FAIL、exit 0）に変わったことを確認した。

### FR-2.12 実装過程で見つけた設計ミスと修正

当初、FR-2.12 の control（「インストーラの実行元 repo（`root`）自身の doctor が green のままであること」）を、このリポジトリ自身に対して直接 `doctor --project-dir .` を実行する形で書いた。実行したところ、このリポジトリ自身の直近セッションに起因する非決定的な既存警告（本 Intent の `.aidlc-hooks-health/stop.drops` に蓄積した `Hook drops: stop` カウント）により、本 Bolt の変更と無関係に FAIL することが判明した（RED、ただし installer 実装のバグではなく eval 設計側の問題）。

target 引数への追従を検証したい本来の目的に対し、ambient なリポジトリ状態への依存は無関係かつ非決定的であるため、control を「独立した 2 つ目の新規インストール workspace（`wsControl`）」に置き換えた。`ws` を破壊した前後で `wsControl` が常に green のままであることを確認する形にし、この非決定性を排除した（`dev-scripts/evals/installer/check.ts` の FR-2.12 ブロック）。修正後は安定して GREEN であることを複数回の再実行で確認した。
