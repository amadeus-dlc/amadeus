# Business Logic Model — u001-installer-versioning（260706-installer-versioning）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、refined-mockups の mockups.md / interaction-spec.md（実装の正）

## 型（scripts/amadeus-install.ts 内に追加）

```ts
type InstallManifest = {
  installedAt: string;          // ISO 8601 UTC
  sourceCommit: string;         // 40 桁 hex or "unknown"
  hashAlgorithm: "sha256";
  files: Record<string, string>; // target 相対 POSIX path -> sha256 hex（辞書順で書き出し）
};
type WriteAction = "created" | "overwritten" | "backed-up" | "restored" | "skipped";
type WriteResult = { relPath: string; hash: string; action: WriteAction; obsolete?: boolean };
type ObsoleteResult = { relPath: string; backedUp: boolean }; // backedUp = 改変ありで退避した
```

- `scanObsolete` の最終シグネチャ: `scanObsolete(rootRel: string, distSet: Set<string>, recorded: Record<string, string>): ObsoleteResult[]`。recorded（旧 manifest の files）との比較で改変を判定する（FR-2.6。recorded に無い path は判定不能のため退避側に倒す = bootstrap と同じ保守則）。

## 3-way 判定表（ThreeWayJudge、純関数）

| recorded（旧 manifest） | current（導入先） | current vs newHash | 結果 |
|---|---|---|---|
| null（bootstrap / 新規追跡） | 不在 | — | created（新規書き込み） |
| null | 存在 | 一致 | skipped（書き込み省略。計上のみ） |
| null | 存在 | 不一致 | backed-up（保守的退避 → 上書き。FR-2.4） |
| あり | 不在 | — | restored（再作成。FR-2.1(c)） |
| あり | 存在、current = recorded | — | overwritten（未改変 → 上書き。newHash = current なら skipped） |
| あり | 存在、current ≠ recorded | — | backed-up（改変 → 退避 → 上書き。FR-2.1(b)） |

- **グローバル優先規則**: current = newHash（導入先がすでに新配布物と一致）なら、recorded の値に関わらず常に skipped とする。この規則がないと「途中失敗 → 再実行」で、前回上書き済みの未改変ファイル（current = newHash ≠ recorded）が改変と誤判定され二重退避・誤計上される（§12a nfr-requirements 反復 1 指摘 3。REL-1 の非二重退避はこの規則が前提）。B002 の eval に「途中失敗 → 再実行で退避 0 件」の検査を追加する（FR-5.1 の追補 (i)）。
- 本表の対象は「新配布物に存在するファイル」だけである。旧 manifest に記録され新配布物に無いファイル（廃止 = FR-2.6）は本表を通らず、scanObsolete が recorded との比較で退避可否を判定する（役割分担の境界）。
- settings.json の特則（AD-6）: newHash は merge(current, wiring) の結果から計算。判定表は共通。既存の pre/post スナップショット deep-compare（mergeSettings 内の安全網、369〜434 行）は trackedWrite 呼び出しの外側にそのまま残す。
- B001 では judge を「常に overwrite/created/restored 相当」に固定（従来挙動互換）し、B002 で表の全行を有効化する。

## B001-manifest-skeleton の実装手順（walking skeleton）

1. eval へ (a)(e) 系 assertion を先行追加し RED を確認（manifest 生成と内容一致、--version-info 3 系、previous install 行）。
2. 型と ManifestStore（read/write。write は files 辞書順、途中失敗時は呼ばれない位置 = main 末尾）。
3. copyEngine / copySkills をファイル単位化（AD-7）。実装上の要点 4 つ:
   - enumerateDist は種別判定に `statSync`（`lstatSync` ではない）を使い、シンボリックリンクディレクトリを実体として再帰降下する。配布元の `.claude/skills/amadeus*` は `.agents/skills/*` への symlink dir（現行 cpSync の dereference: true が担っていた前提）であり、lstat ベースの素朴な列挙は中身を丸ごと取りこぼす。
   - 導入先側（scanObsolete の対象走査）にも配布元と同じフィルタを適用する: skills root は `amadeus*` prefix のエントリだけを比較対象にする（現行 240 行の targetNames filter と同じ。非 amadeus skill を distSet 不在という理由で消さない（#451 eval の既存 assertion 名 FR-2.11 = non-amadeus skill byte-identical の保全。本 Intent の FR 番号ではない））。
   - ディレクトリ粒度の後始末: scanObsolete でファイルを削除した結果、skill dir（または engine 配下の子 dir）の全エントリが消えた場合は親 dir 自体を rmSync で除去する（BR-13 の既存 assertion は `!existsSync(dir)` で dir の消滅を検証している）。
   - B001 では判定を従来同様（無条件削除・無条件上書き）に固定するが、経路は enumerateDist / trackedWrite / scanObsolete に一本化しておき、B002 で判定を差し込む。
4. placeAmadeusMd / mergeSettings の writeFileSync を trackedWrite 経由へ。
5. SourceCommitResolver（Bun.spawnSync(["git","rev-parse","HEAD"]) を配布元 root で実行）。失敗モードは 2 種を区別せず両方 "unknown" + 告知行へ倒す: (i) git repo でない = 非 0 exit、(ii) git コマンド不在 = spawnSync が throw（smoke() の REL-3 で実際に踏んだ教訓。既存 444〜454 行と同じ try/catch 構造にする）。
6. parseTargetArg へ --version-info 追加。printVersionInfo（正常 = stdout 1 行 exit 0、不在 = stderr + fix: exit 1、単独指定 = dieUsage）。
7. main へ previous install found / bootstrap 告知（B001 では bootstrap 告知は出すが挙動は従来同様）と ManifestStore.write を接続。
8. eval GREEN + 既存 271 assertion の全 GREEN を確認。

## B002-threeway-backup の実装手順

1. eval へ (b)(c)(d)(f)(g)(h) 系 assertion を先行追加し RED を確認。
2. ThreeWayJudge の全行有効化（グローバル優先規則 = current = newHash → skipped を含む）。BackupWriter（時刻 dir 遅延作成、`:`→`-` 置換、相対 path 保存）。readManifest で読んだ recorded のキーは使用前に検証し、`..` セグメントまたは絶対 path を含むものは InstallError（fix: 付き）で拒否する（SEC-2。導入先 manifest は利用者が編集し得るため信頼しない）。
3. scanObsolete へ判定を差し込み（改変 = 退避 → 削除、未改変 = 削除。stale-skill 経路もここへ統合済み）。
4. SummaryReporter（ヘッダ = 退避総数 = 列挙行数、obsolete 内数行、restored 件数行。該当時のみ）。ステップ行 detail の件数付与。
5. settings 特則（AD-6）の結線。
6. README（英語 + README.ja.md）へ更新戦略節 + BR-13 注意書き。
7. eval GREEN + test:all。自己導入の走査混入確認と除外: 候補は (i) `.gitignore` へ `.amadeus-install.json` / `.amadeus-install-backup/` を追加（自己導入時の誤 commit 防止）、(ii) `dev-scripts/generate-parity-baseline.ts` / `parity-check.ts` の走査は `.agents/` 起点のため backup dir（repo 直下）は構造上乗らないことを確認、(iii) `lints/` と rename-leftovers eval の走査対象に repo 直下の新規 dotfile が含まれるかを grep で確認し、含まれる場合のみ除外を追加。

## 検証

- 全手順で TDD（RED → GREEN）。中断時は遡及 RED 検証（learnings c6）。
- 実測・実装記録は code-generation の code-summary.md に集約する。
