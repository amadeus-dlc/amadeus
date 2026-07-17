# Requirements — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../../ideation/intent-capture/intent-statement.md`(成功の姿)、`../../ideation/scope-definition/scope-document.md`(In 1〜5)、codekb の business-overview.md / architecture.md / code-structure.md(RE 全数再検証済み台帳 — 特に code-structure.md:79-129 の harness port 開放性節)、`../practices-discovery/team-practices.md`(既存実践の live 温存確認)、RE scan-notes.md(面1〜6+Architect 合成)、`../../ideation/rough-mockups/wireframes.md`(AC 文言導出元)、`../../ideation/feasibility/constraint-register.md`(C-1〜C-6)、requirements-analysis-questions.md(Q1 = B 裁定済み)。2026-07-16。
> 既決照合: 変更面・検証方式・契約固定は Issue #1048+RE 実測+E-OC7 系裁定で既決。Q1(付随3面)は E-1048-RA-Q1 = B で裁定済み(FR-6 に裁定+留保を転記)。

## FR-1: installer 閉じ列挙の 4→6 値化(8サイト)

RE 面1の全数台帳どおり、以下8サイトを opencode / cursor で拡張する(追加ロジック禁止 — 列挙拡張のみ):

- AC-1a: `harness.ts:9`(union 型)+`:19-24`(`HarnessName.all` frozen 配列)— 6値
- AC-1b: `engine-layout.ts:8-13`(`ENGINE_DIR_BY_HARNESS`)— `opencode: ".opencode"` / `cursor: ".cursor"`(**各固有 dir — kiro/kiro-ide 型の共有にしない**。Architect リスク①)
- AC-1c: `reporter.ts:24-25`(usage 2本)+`:137`(invalid 文言)— wireframes モック1/3 の文字列と exact 一致
- AC-1d: 契約テスト2本(`setup-harness.test.ts:13` / `setup-harness-parse.test.ts:17`)— 件数・集合 literal を6値へ(「four known harnesses」等の文言も全数更新 — Architect リスク②、grep 全数棚卸し(same-root-inventory)で封鎖)
- AC-1e: 上記以外に per-harness 分岐・ハードコードを**追加しない**(RE 面2: wizard/verifier/plan/payload の汎用機構に自動伝播 — 逸脱は実装前停止)

## FR-2: 列挙全数性のテスト固定

- AC-2a: installer 側は literal 固定契約(AC-1d のテスト2本)を正とする — dist ディレクトリ列挙からの動的導出は禁止(共変偽 green — R-3、t149 ヘッダ :10-19 と同思想)
- AC-2b: dist 側の存在面は既存 t149(opencode/cursor カバー済み)+dist:check が担保 — 本 intent での二重実装はしない(二層分担の維持)

## FR-3: install 完走の実測検証(ローカル・ネットワーク不要)

- AC-3a: 既存 `tests/integration/setup-install-flow.test.ts` の様式(Http port を fakeHttp 差し替え+`buildCodeloadFixture` の codeload 形状合成アーカイブ)で、`install --harness opencode` / `--harness cursor` の install→verify 完走を in-process 検証する(fixture へ `dist/opencode` / `dist/cursor` エントリ追加)
- AC-3b: 正常系の出力は wireframes モック2 の様式(既存 ACTION_LABELS 経路 — 文言の新規発明なし)
- AC-3c: 未知ハーネス(`--harness foo`)は exit 2+6値列挙のエラー(モック3)— 既存 parse 経路の挙動保存を実測

## FR-4: 公開物実検証+将来条件チェックリスト(c3/c4 既決の再固定)

- AC-4a: `npm pack --dry-run` 実ツール検証が新列挙で green(pack-contract は変更不要 — RE 面3の実測どおり、変更が生じた場合は逸脱として停止)
- AC-4b: 将来条件チェックリスト(c4): 規模増(ハーネス7値目の追加手順 = 本 intent の 8サイト+テスト2本+README が全数台帳)/ クラッシュ耐性(installer の既存アトミック性は非接触)/ 別 OS(列挙は OS 非依存)/ 消費側棚卸し(README :109 prose・「Pick your harness」表 — FR-5)を requirements に明記して後続へ渡す

## FR-5: README 同期(docs-language-ownership — 英語正本)

- AC-5a: `README.md:58-59` の OpenCode/Cursor 行から「manual install」注記を installer コマンド記載へ更新
- AC-5b: `README.md:109` の wizard prose 列挙を 4→6 値へ
- AC-5c: README.ja.md が存在する場合は対訳同期(レビュー観点)

## FR-6: 付随2面(runtime)の advisory 更新(E-1048-RA-Q1 = B)

裁定(2026-07-16T11:56:58Z、agmsg 出典): **B = installer 5面+runtime 2面を更新、migrate・self-install は非更新**(migrate は移行経路限定、self-install は実質スコープ拡張でユーザー判断事項)。留保転記2件(裁定に収載): (e3)**runtime 2面の更新根拠は advisory 一貫性であり、install 正しさ要件(FR-1〜FR-3)とは分離した AC として扱う**。(e2、後着 4/4 閉包時 — 機構引用は 12:11Z の等価確認で訂正済み)**KNOWN_HARNESS_DIRS の更新は probe-order hint(fallback 台帳)の6値化のみで、権威は script-path derivation のまま(権威の変更ではない。harness.json の権威は rulesSubdir 経路(:165-175)の別事項)**。

- AC-6a: `amadeus-lib.ts:121` `KNOWN_HARNESS_DIRS` へ `.opencode` / `.cursor` を追加。特徴づけ(E-1048-FD-Q1 = A 裁定 2026-07-16T14:57:55Z で訂正): 本定数は harnessDir(:142)/ resolveProjectDir(:227)の CWD probe に加え、`hasWorkspaceMarker`(:268-271 `KNOWN_HARNESS_DIRS.some((h) => isDir(join(dir, h, "tools")))`)経由で `resolveProjectDirFromHook` の **rung 2**(script-path derivation = rung 3 より先)に消費される — **全フックの project-dir 解決への実挙動変更を含む**。rung 2 の存在理由はコード verbatim(:293-296、e2 発掘)「In a worktree session the hook SCRIPTS live in the launch dir (the main checkout), so rung 3 below would converge on main even though the engine's cwd — and the record it writes — is the worktree.」であり、opencode/cursor 単独 worktree は現行3値で rung 2 偽陰性(e4 実測)— 6値化はこの潜在誤収束の解消。権威(rung 3 の script-path derivation :110-116/:130-138)自体の変更ではない点は従前どおり。harness.json の権威は rulesSubdir 経路(:165-175)の別事項
- AC-6b: `amadeus-utility.ts:860` `otherTrees` へ opencode / cursor を追加 — doctor の他ツリー検出 advisory が installer 生成ツリーを列挙できること(「installer が作ったものを doctor が知らない」不整合の解消)
- AC-6c: 両更新とも新たな hard gate・fail 経路を作らない(otherTrees は advisory 表示のみ。KNOWN_HARNESS_DIRS は AC-6a の訂正どおり hook 解決への実挙動変更を含むが、失敗経路の追加はない — 検証劇場回避と裁定留保の双方)
- AC-6e(E-1048-FD-Q1 = A 裁定で追加): opencode / cursor 名の worktree レイアウトで `resolveProjectDirFromHook` / `hasWorkspaceMarker` が worktree を marker として解決することのテストを最低1本追加する
- AC-6d: migrate(`amadeus-migrate.ts:71`)と self-install(`promote-self.ts:37-41`)は**非接触** — 触れる必要が生じたら逸脱として実装前停止


## 横断(品質契約)

- 全検証コマンド同期実行+exit code 報告(typecheck / lint / dist:check / promote:self:check / --ci / coverage+patch gate)。新規テスト行は in-process 被覆(C-6)
- テスト配置層のサイズ純度(C-2)。deslop。PR 1:1(closing keyword = `Fixes #1048`、クローズは着地検証後)
- 検証 exit code はパイプ越しに捕捉しない(E-PM5 M1)

## トレーサビリティ

| Issue #1048 / scope In | FR |
|---|---|
| 閉じ列挙5ファイル更新(In 1) | FR-1 |
| 全数性テスト(In 2) | FR-2 |
| install 正常系完走(In 3) | FR-3 |
| npm pack+将来条件(In 4) | FR-4 |
| README 2行(In 5) | FR-5 |
| 付随判断(Q1=B 裁定) | FR-6 |
