# コード生成サマリー — unit: u001-engine-installer（Bolt B001 + B002）

対応 Issue: [#451](https://github.com/amadeus-dlc/amadeus/issues/451)
上流入力: `code-generation-plan.md`、[business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[reliability-design.md](../nfr-design/reliability-design.md)、[mockups.md](../../../inception/refined-mockups/mockups.md)・[interaction-spec.md](../../../inception/refined-mockups/interaction-spec.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[bolt-plan.md](../../../inception/delivery-planning/bolt-plan.md)

Bolt B001（walking skeleton）と Bolt B002（hardening）の完了報告。B002 の内容は本ドキュメント末尾の追加節（「新規 eval 一覧（B002）」以降）にまとめ、B001 時点の記述はそのまま残す。

## 変更ファイル一覧

### インストーラ本体（新規）

- `scripts/amadeus-install.ts`（新規）
  - `MANIFEST`（export）: `engineDirs` 7、`skillsGlobPrefix`、`claudeSymlinks` 7（engineDirs と同一配列を共有）、`amadeusMd.removeSections`（H2「Development Rules」）・`removeBlocks`（宣言的ブロック 4 件）・`devReferencePatterns`（負方向検査パターン文字列 5 件）、`hooksWiring`（11 entry）。
  - `transformAmadeusMd(source)`（export、純関数）: `removeBlocks` → `removeSections` → 連続空行の圧縮の順で適用。宣言対象が原本に不在なら throw（BR-5）。
  - `preflight(target)`: 不在・非ディレクトリ・書き込み不可の 3 パターンを検査し、いずれも同一の fix 文言（`--target` の指定修正）でエラー中断。
  - `copyEngine(src, target)`: 7 dir を `rmSync` → `cpSync(..., {dereference:true})` で全置換。
  - `copySkills(src, target)`: `.claude/skills`・`.agents/skills` の両方で `amadeus*` prefix のみ全置換（非対象は不可侵）。`dereference:true` を指定し、本リポジトリ自身の `.claude/skills/amadeus*` が symlink（`../../.agents/skills/amadeus*`）である事実に関わらず、配置先には実体コピーを作る（Codex が `.agents/` 単体で成立する前提 FR-4.1 を壊さないため）。
  - `placeAmadeusMd(src, target)`: 原本を読み `transformAmadeusMd` を適用して target root へ全置換書き込み。
  - `relinkClaude(target)`: 7 entry を `lstat` 判定し、不在なら作成・symlink なら張り直し・それ以外は throw（対象 path + fix 案内、BR-3）。
  - `mergeSettings(target, wiring)`: JSON parse 失敗・非オブジェクトは throw（無変更）。matcher+command 重複排除、manifest 管理コマンドを含む同一 matcher の最初のブロックへ追記、なければ新規ブロック追加。書き込み後に再読込して JSON 妥当性を検証。
  - `smoke(target)`: `bun <target>/.agents/amadeus/tools/amadeus-utility.ts doctor --project-dir <target>`（cwd=target）を起動し pass/output を返す。
  - CLI: `--target` 必須・非対話、5 工程（`[n/5] <label(14桁左詰め)><detail>`）、smoke fail 時は「installed but smoke check failed」+ doctor 出力 + fix 案内で exit 1（配置完了と区別、BR-11）。

### 専用 eval（新規）

- `dev-scripts/evals/installer/check.ts`（新規）
  - FR-2.5: `MANIFEST` の各フィールドを本リポジトリの実レイアウト（`.agents/amadeus/` 7 dir、`.claude/` 7 symlink、`.claude/settings.json` の hooks 11 entry、`AMADEUS.md` の除去対象正方向存在）と突き合わせ。
  - FR-2.1: 隔離 temp workspace（`aidlc/spaces/default/memory/` を事前seed）へ実インストーラを `Bun.spawnSync` で駆動し、exit 0・5 工程マーカー・smoke pass を検査。
  - レイアウト検査: 7 engine dir、`.claude/skills`・`.agents/skills` の `amadeus*` 存在、7 symlink の相対ターゲット、`AMADEUS.md` の負方向検査（`devReferencePatterns` 使い回し）、`settings.json` の hook command 数 = 11。
  - FR-2.2: target 配下の `tools/*.ts`・`hooks/*.ts` 全 37 ファイルを `bun build --target=bun <file> --outfile <tmp>` で駆動し、import グラフ解決のみで exit 0 になることを検査（採用理由は code-generation-plan.md「設計からの逸脱と判断」参照）。
  - FR-2.3: 同一 target へ 2 回目のインストールを実行し、exit 0・hook command 数が引き続き 11（重複なし）・symlink 再検査。
  - FR-2.8: `try/finally` で temp workspace を必ず削除し、削除後の不在を検査。

### 設定・契約

- `package.json`: `amadeus:install`（`bun run scripts/amadeus-install.ts`）と `test:it:installer`（`bun run dev-scripts/evals/installer/check.ts`）を追加。`test:it:all` チェーンの末尾に `test:it:installer` を追記（既存順序を変更せず追記のみ）。
- `tsconfig.json`: `include` に `scripts/**/*.ts` を追加（新規ディレクトリを型検査対象に含めるための最小追記。他エントリは変更なし）。

## FR トレーサビリティ（B001 + B002、完了）

| FR | 実装/検証箇所 | 状態 |
|---|---|---|
| FR-1.1（事前チェック・非対話） | `preflight`、`parseTargetArg` | 実装済み・検証済み（FR-2.10） |
| FR-1.2（engine 全置換） | `copyEngine` | 実装済み |
| FR-1.3（skills 全置換） | `copySkills` | 実装済み・検証済み（FR-2.11） |
| FR-1.4（AMADEUS.md 変換） | `transformAmadeusMd`、`placeAmadeusMd` | 実装済み・検証済み（FR-2.6 双方向） |
| FR-1.5（symlink 再作成・衝突エラー） | `relinkClaude` | 実装済み・検証済み（FR-2.9a） |
| FR-1.6（settings hooks マージ） | `mergeSettings` | 実装済み・検証済み（FR-2.7、FR-2.9b） |
| FR-1.7（smoke 自動実行） | `smoke`、CLI 工程 5 | 実装済み・検証済み（FR-2.12） |
| FR-1.8（冪等・非ロールバック） | 各関数の全置換/union 設計 | 実装済み、FR-2.3・FR-2.7 で検証 |
| FR-1.9（aidlc/ 不可侵） | インストーラは `aidlc/` に一切書き込まない | 実装済み・検証済み（FR-2.13） |
| FR-1.10（マニフェスト集約） | `MANIFEST` | 実装済み |
| FR-1.11（package.json script 登録） | `amadeus:install` | 実装済み |
| FR-2.1〜FR-2.5、FR-2.8 | `dev-scripts/evals/installer/check.ts` | 実装済み・GREEN（B001） |
| FR-2.6（AMADEUS.md 双方向） | 同上（合成 source の正方向 throw 検査 + 連続空行圧縮検査） | 実装済み・GREEN（B002） |
| FR-2.7（settings マージ実ファイル駆動） | 同上（既存 hooks fixture、2 回実行） | 実装済み・GREEN（B002） |
| FR-2.9（非破壊中断） | 同上（symlink 実体衝突、解析不能 JSON） | 実装済み・GREEN（B002） |
| FR-2.10（事前チェック 3 パターン） | 同上（不在・非ディレクトリ・書き込み不可） | 実装済み・GREEN（B002） |
| FR-2.11（非対象 skills 不変） | 同上（非 amadeus skill fixture） | 実装済み・GREEN（B002） |
| FR-2.12（スモーク偽陽性回帰） | 同上（`smoke()` ミラー呼び出し + 独立 control target） | 実装済み・GREEN（B002） |
| FR-2.13（aidlc/ 不可侵の動的検証） | 同上（marker file、2 回インストール） | 実装済み・GREEN（B002） |
| FR-3.1（README） | README.md「Install into a Workspace」、README.ja.md「利用者向け導入手順」 | 実装済み（B002） |
| FR-4.1（Codex `.agents/` 完全性） | `copySkills`/`copyEngine` の dereference 実体コピー + eval の symlink 再帰検査 | 実装済み・GREEN（B002） |

## RED→GREEN 証跡

### B001

- RED: `scripts/amadeus-install.ts` を退避した状態で `bun run dev-scripts/evals/installer/check.ts` を実行し、`error: Cannot find module '../../../scripts/amadeus-install.ts'`（exit 1）を確認。
- GREEN: 実装後に同コマンドを再実行し、全 assertion pass・`installer eval: ok`（exit 0）を確認。

### B002

- RED: FR-2.6〜FR-2.13、FR-4.1、FR-3.1 の新規 assertion（148 件、README 追記前）を追加した直後に実行し、次の 2 件だけが FAIL することを確認した（他はすべて B001 実装がそのまま満たしていたため最初から GREEN）。

  ```
  FAIL: FR-3.1 README.md documents the installer command, doctor verification, and re-run-to-update
  FAIL: FR-3.1 README.ja.md documents the installer command, doctor verification, and re-run-to-update
  ```

- GREEN: README.md・README.ja.md へ節を追加した後に再実行し、全 261 assertion pass・`installer eval: ok`（exit 0）を確認した。
- 追加の RED→GREEN（eval 設計の修正）: FR-2.12 の control 実装を「実行元 repo（`root`）自身の doctor」から「独立した 2 つ目の新規インストール workspace」へ差し替えた経緯は、下記「B002 で見つかった設計上の問題」参照。

## 検証結果

| 検証 | 結果 |
|---|---|
| `bun run dev-scripts/evals/installer/check.ts`（B001+B002、RED→GREEN 済み、261 assertion） | pass |
| `npm run test:it:installer` | pass |
| `npx tsc --noEmit` | pass（エラー 0 件） |
| `bun run lints/check.ts --check` | pass（0 violations） |
| 実機 CLI 確認（`--target` 欠落・不在・非ディレクトリの 3 パターン、正常系のフル出力） | mockups.md / interaction-spec.md の文言と一致することを目視確認 |

`npm run test:all`・`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-engine-installer` は Bolt PR 準備段階でまとめて実行し記録する方針を維持する（bolt-plan.md: PR は単一、B001/B002 は同一 branch 上の実装区切り）。

## 主要判断

1. **copySkills は常に `dereference:true` で実体コピーする。** 本リポジトリ自身の `.claude/skills/amadeus*` は `.agents/skills/amadeus*` への relative symlink（開発上の重複回避の慣習）だが、component-methods.md の契約と FR-1.3 の「全置換コピー」はインストール先の 2 系統がそれぞれ独立した実体であることを前提とする（FR-4.1: Codex は `.agents/` 配置のみで成立する必要があり、`.agents/skills/*` が `.claude/` 側への依存を持ってはならない）。`fs.cpSync` は `dereference` 未指定だと symlink をそのまま複製するため、明示的に `true` を指定した。
2. **FR-2.2 のモジュール読み込み検証手法を `bun -e "await import(...)"` から `bun build --target=bun` へ変更した。** 理由は code-generation-plan.md の「設計からの逸脱と判断」に詳細を記録した。要点は、一部エンジンツールが `import.meta.main` ガードなしに `main()` を無条件実行するため、動的 import 駆動では「サブコマンド未指定」という無関係な usage エラーで false negative になること。
3. **smoke 対象の eval fixture は `aidlc/spaces/default/memory/` を事前 seed する。** doctor の「workspace shell ready」検査が同ディレクトリの存在を要求する一方、インストーラ自身は `aidlc/` に一切書き込まない契約（BR-1、FR-1.9）のため、eval 側で「シェル導入済みの workspace へインストーラを実行する」という実運用を模した。
4. **エラーパスの実装（relinkClaude の symlink 衝突、mergeSettings の JSON parse 失敗）は B001 の時点で完成させたが、専用 eval fixture は追加していない。** bolt-plan.md が B001 のスコープを「eval 骨格（FR-2.1〜2.5、FR-2.8）」、B002 を「異常系と品質の完成」と明記しているため、依頼テキストの指示（「only their dedicated eval fixtures are B002」）どおりに区分した。

## 逸脱

- FR-2.2 の検証方法変更（`bun -e import` → `bun build --target=bun`）。理由は上記「主要判断」2 と code-generation-plan.md 参照。動作上の検証対象・厳密性は変わらない（むしろ import 未解決を確実に検出できる分、より厳密）。
- `tsconfig.json` の `include` に `scripts/**/*.ts` を追加した。依頼テキストに明示の指示はなかったが、これを追加しない限り `npx tsc --noEmit` が新規ファイルを型検査対象に含めず「typecheck green」の確認自体が無意味になるため、既存の `dev-scripts/**/*.ts` 等と同様の追記型変更として実施した。

## B002（hardening）変更ファイル一覧（追加分）

`scripts/amadeus-install.ts` 自体への変更は不要だった（B001 の異常系実装が要求をすでに満たしていたため）。変更したのは次の 3 ファイルである。

- `dev-scripts/evals/installer/check.ts`（拡張）: 下記「新規 eval 一覧（B002）」の 9 系統・148 assertion を追加。既存の B001 assertion（113 件）はそのまま残し、追記のみ。
- `README.md`（追記）: `## Install into a Workspace` 節を `## Quickstart` の直後、`## Usage` の直前に追加（導入コマンド、インストール内容、post-install 検証、更新規約、Bun 前提）。
- `README.ja.md`（追記）: 同節を `## 利用者向け導入手順` として日本語で追加（README.md と対の構成を維持）。

`package.json`・`tsconfig.json` への追加変更はなし（B001 で追加済みの内容のまま。依頼テキストの制約どおり）。`.coderabbit.yml`、`.agents/amadeus/`、`aidlc/` エンジン資産への変更もなし。

## 新規 eval 一覧（B002）

`dev-scripts/evals/installer/check.ts` への追加分。実装済みロジックの検証であり、`scripts/amadeus-install.ts` の修正を要した項目はなかった（下記「B002 で見つかった設計上の問題」の 1 件を除く。ただしそれは eval 側の設計修正であり、インストーラ実装の修正ではない）。

| FR | assertion 群 | 検証内容 |
|---|---|---|
| FR-2.6 | `transformAmadeusMd` の合成 source テスト（baseline 1、removeBlocks 欠落 4、removeSections 欠落 1）+ 連続空行圧縮 1 | 宣言対象が原本に無いと throw する正方向、両方の除去層の欠落それぞれで独立に throw すること、除去後に `\n\n\n` が残らないこと |
| FR-2.7 | 既存 `env`・`permissions`・利用者自身の hooks ブロック（`UserPromptSubmit` の matcher `""`、`PostToolUse` の matcher `"Write\|Edit"`）を持つ fixture への 2 回インストール | JSON 再読込可能性、非対象キーの不変、既存ブロックの順序保持と内容不変、hook command 数が「manifest 11 + 利用者 2 = 13」で 2 回目も重複なく収束すること |
| FR-2.9 | (a) `.claude/agents` に実体ディレクトリがある fixture、(b) 解析不能 `settings.json` の fixture | いずれも exit 1、stderr に対象 path + 再実行案内、衝突対象がバイト単位・mtime 単位で無傷であること |
| FR-2.10 | target 不在、target がファイル、target が書き込み不可（chmod 000、root 実行時はスキップ） | 3 パターンとも exit 1、interaction-spec 文言表と一致する reason、`--target` 案内、対象に変更が生じないこと |
| FR-2.11 | `.claude/skills/`・`.agents/skills/` に非 amadeus skill を事前配置した fixture | インストール後も対象ファイルがバイト単位・mtime 単位で無傷であること |
| FR-2.12 | `smoke()` と同じ呼び出し形（`bun <target>/.../amadeus-utility.ts doctor --project-dir <target>`、cwd=target）を eval 側で再現し、intact な target・独立した control target・`.claude/settings.json` を除去して壊した target の 3 通りに直接駆動 | 壊した target だけが fail し、無関係な独立 target は影響を受けず green のままであること（target 引数への追従の証明） |
| FR-2.13 | `aidlc/spaces/default/memory/` に marker file を事前配置し、2 回インストール | marker file・既存 `org.md` がバイト単位・mtime 単位で無傷であること |
| FR-4.1 | `.agents/amadeus/*` 7 dir・`.agents/skills/amadeus*` 配下を再帰的に symlink 走査 | いずれも symlink を含まない実体であること（Codex が `.agents/` 単体で成立する契約の直接検証） |
| FR-3.1 | README.md・README.ja.md のテキストに導入コマンド・`doctor`・`amadeus:install` への言及があることを確認する軽量な回帰ガード | ドキュメント節が今後無言で失われないことの検知 |

## B002 で見つかった設計上の問題

FR-2.12 の control（「インストーラの実行元である本リポジトリ自身（`root`）に対して直接 `doctor --project-dir .` を実行し、green のままであること」）を最初に書いたところ、実行時に FAIL した。原因を調べると、`scripts/amadeus-install.ts` のバグではなく、このリポジトリ自身が本 Intent の作業セッション中に蓄積した非決定的な既存警告（`aidlc/spaces/default/intents/260705-engine-installer/.aidlc-hooks-health/stop.drops` に記録された `Hook drops: stop` カウント）によるものだった。

FR-2.12 が検証したいのは「smoke の対象が `--target`/`cwd` の引数どおりであること」であり、リポジトリ自身の ambient な健全性はこの検証と無関係かつ非決定的である。そこで control を「独立した 2 つ目の新規インストール workspace（`wsControl`）」に差し替えた。`ws` を `.claude/settings.json` 除去で破壊する前後の両方で `wsControl` が green のままであることを確認する形にし、この非決定性を排除した。この変更は eval（`dev-scripts/evals/installer/check.ts`）だけに閉じており、`scripts/amadeus-install.ts` の修正は伴わない。

## reviewer（§12a）対応の追記

stage reviewer（amadeus-architecture-reviewer-agent、iteration 1）は NOT-READY（軽微 3 件）と判定し、次を修正した。

1. `smoke()` 呼び出しを工程 1〜4 と同じ try/catch + エラー整形（step 5/5 形式）で包んだ（REL-3。Bun.spawnSync は $PATH 不在時に例外を投げることを reviewer が実測）。
2. FR-1.1 の usage エラー経路（--target 欠落、未知引数）の eval assertion 4 件を追加した。
3. BR-13 の stale skill 削除分岐（配布元から消えた amadeus* skill を対象側から削除し、非対象は残す）の eval assertion 6 件を追加した。

追加分を含め eval は全 pass（271 assertion 相当）、typecheck clean。reviewer の実測確認（正常系・異常系の文言 1 文字単位一致、MANIFEST と実レイアウトの一致、変換後 AMADEUS.md の dev 参照 0 件）は iteration 1 の報告に記録されている。
