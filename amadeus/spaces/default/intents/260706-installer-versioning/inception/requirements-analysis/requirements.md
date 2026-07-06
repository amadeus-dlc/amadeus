# Requirements — 260706-installer-versioning（Issue #543）

上流入力: [intent-statement.md](../../ideation/intent-capture/intent-statement.md)、[scope-document.md](../../ideation/scope-definition/scope-document.md)、[team-practices.md](../practices-discovery/team-practices.md)、record の audit shard にある user project description（Intake）、codekb の [business-overview.md](../../../../codekb/amadeus/business-overview.md) / [architecture.md](../../../../codekb/amadeus/architecture.md) / [code-structure.md](../../../../codekb/amadeus/code-structure.md)

## 前提（確定済み設計の参照）

ピア協議 6 問（feasibility、6 名全問 A 一致）と Ideation の decision-log 6 件を前提とする。本ステージは Inception 確定待ち 4 件 + 縁ケース 1 件（計 5 件）を確定し、全体を検証可能な FR にする。

## Inception 確定 5 件（引き継ぎ 4 件 + 縁ケース 1 件）

| # | 項目 | 確定 | 根拠 |
|---|---|---|---|
| 1 | manifest ファイル名 | `<target>/.amadeus-install.json` | エンジンマーカーの既存命名族（`.amadeus-*`）と一貫。target 直下 = C-4（amadeus/ 不可侵） |
| 2 | 版確認の入口 | `--version-info` flag | 既存 CLI は flag 形式（`--target`、dieUsage の usage 行）で subcommand を持たない。CLI 形状を変えない最小追加 |
| 3 | 退避 dir の時刻表記 | ISO 8601 の `:` を `-` へ置換（例: `2026-07-06T09-30-00Z`） | ファイルシステム安全（macOS / Linux / Windows）。manifest の installedAt は ISO 8601 のまま |
| 4 | manifest 自身の files 表への含否 | 含めない。退避 dir（`.amadeus-install-backup/`）も追跡対象外 | 自己参照の回避。退避物は配布物ではない |
| 5 | sourceCommit 取得不能時（git 不在の配布形態など） | `"unknown"` を記録し、出力で告知する | 無言の失敗禁止（縁ケースの確定） |

## 機能要求

### FR-1: manifest（版とハッシュの記録）

- FR-1.1: インストーラは導入・更新の成功時に `<target>/.amadeus-install.json` を書き出す。内容は `installedAt`（ISO 8601 UTC）、`sourceCommit`（配布元 repo の `git rev-parse HEAD`。取得不能時は `unknown` を記録し告知）、`hashAlgorithm`（`"sha256"`）、`files`（コピー対象全ファイルの target 相対 path → sha256。AMADEUS.md は変換後、settings.json は merge 後の書き込み内容の値）。
- FR-1.2: manifest 自身と退避 dir は `files` に含めない。
- FR-1.3: manifest の書き出しは全コピー完了後に 1 回行う（部分書き込みでの不整合を避ける）。

### FR-2: 3-way 判定と退避型更新

- FR-2.1: コピー対象の各ファイルについて、書き込み前に 3-way 判定を行う: (a) 導入先が記録ハッシュと一致（未改変）→ 上書き、(b) 不一致（改変）→ FR-2.2 の退避後に上書き、(c) 導入先に不在（削除）→ 再作成し件数を告知、(d) 導入先が新配布物と既に一致 → 書き込み省略可（結果は同一）。
- FR-2.2: 改変検出時は `<target>/.amadeus-install-backup/<時刻表記>/<target 相対 path>` へ退避してから上書きする。同一実行内の退避はすべて同じ時刻 dir に入る。
- FR-2.3: 退避・再作成は無言にしない: ステップ行の detail に件数、実行末尾の summary に退避ファイルの列挙（`amadeus-install: ` prefix 行）を出す。
- FR-2.4: bootstrap（manifest 不在）では、導入先に存在し新配布物と不一致のファイルをすべて「改変」とみなし FR-2.2 を適用する（協議 Q6 = 保守的）。
- FR-2.5: 3-way merge・退避物の世代管理・自動清掃は行わない（scope-document のスコープ外）。
- FR-2.6: 旧 manifest の `files` に記録されているが新配布物に存在しないファイル（廃止・改名）が、導入先で改変されていた場合も FR-2.2 の退避対象とする（全置換で無言消失させない）。未改変なら従来どおり消える（収束）。

### FR-3: 版の確認

- FR-3.1: `--version-info` flag で、manifest の `sourceCommit`・`installedAt`・追跡ファイル数を 1 行で表示して正常終了する（インストールは実行しない）。`--target` と併用必須（既存 CLI と同じ必須引数。単独指定は usage エラー）。
- FR-3.3: 更新実行（インストール）の起動時、manifest が存在すれば前回導入情報（`previous install found (commit <c>, <installedAt>)`）を 1 行告知する（wireframes.md の承認済み様式）。
- FR-3.2: manifest 不在時は不在の旨 + `fix: ...` ヒント（導入コマンドの再実行で versioned manifest が作られる）を表示する。

### FR-4: 互換と維持

- FR-4.1: 非対話 1 コマンド（C-1）と冪等性（C-2）を維持する。同一配布物での再実行は退避を発生させず、出力は従来と同一。
- FR-4.2: 既存の出力様式（混合形式 = DR-1）とエラー規約（`fix:` = DR-2）を踏襲する。
- FR-4.3: `amadeus/` 配下には何も書かない（C-4。manifest・退避 dir とも target 直下）。

### FR-5: 検証（eval）

- FR-5.1: installer eval（dev-scripts/evals/installer/check.ts）に次の検査を先行追加（TDD RED→GREEN）する: (a) 導入成功で manifest が生成され、記録内容が実ファイルの sha256 と一致する。(b) 改変ファイルが退避されてから上書きされ、退避物の内容が改変版と一致する。(c) 未改変・削除・bootstrap の各象限の挙動。(d) 同一配布物での再実行の冪等（退避なし・同一出力）。(e) `--version-info` の正常系（--target 併用）、manifest 不在系（fix: ヒントを含む）、--target なし単独指定の usage エラー系、および更新実行起動時の previous install found 告知（FR-3.3）。(f) 退避・再作成の告知（summary の退避列挙行と件数）が出力に含まれる。(g) manifest の files に manifest 自身と退避 dir 配下が含まれない。(h) 廃止ファイル（旧 manifest に記録、新配布物に不在）が改変されていた場合に退避され、未改変なら消えること（FR-2.6）。
- FR-5.2: eval は隔離 tmp workspace で行い、成功・失敗とも片付ける（DR-3）。

### FR-6: 文書化

- FR-6.1: README（英語 + README.ja.md）へ更新戦略（3-way、退避 dir、`--version-info`、bootstrap の初回挙動、および BR-13 の既知の限界 = 独自 `amadeus*` skill が削除され得る注意書き）を追記する。両言語を同一 PR に含める（language-policy）。
- FR-6.2: #533 guide（docs/guide/01-getting-started.md の Updating 節）への 1〜2 行追随は、実装確定時に engineer5 と担当調整する（scope-document の申し送り）。

## 制約

- Construction 対象は scripts/amadeus-install.ts、dev-scripts/evals/installer/check.ts、README（英日）に閉じる。skills/ 配下に触れる変更が出た場合は leader へ一報（#572 接触面）。
- walking skeleton Bolt の gate は auto 委任の例外として人間の個別確認に回す（practices-discovery の承認要旨）。
- C-6（Construction は #573 merge 後）は充足済み。PR #577 の MERGED 確認は audit shard の scope-definition 宛 DECISION_RECORDED（中継承認 2026-07-06T09:06:28Z の受信記録、「gh pr view 577 = MERGED」を含む）に記録されている（scope-document.md 本文ではなく audit の decision が記録場所）。
- 自己導入（このリポジトリ自身への dogfooding インストール）では、`.amadeus-install-backup/` 配下と `.amadeus-install.json` が repo の走査系検査（parity baseline 生成、lint、rename-leftovers 等）に混入しないことを実装時に確認し、必要なら除外する（ピア協議補強 3 = engineer4）。

## 既知の限界（対象外の明示）

- 利用者が `amadeus*` prefix で独自 skill を導入先に置いた場合、BR-13（stale skill 削除）が配布物に無い skill として削除し得る。これは #451 からの現行仕様であり、hash 管理（ファイル単位）では救えない dir 単位の挙動のため、本 Intent では変更しない（feasibility 実測 4 の論点の決着）。README の更新戦略節に 1 行の注意書きを含める（FR-6.1 の一部）。

## 受け入れ条件（Issue 対応）

| Issue 受け入れ条件 | 対応 FR |
|---|---|
| 版を 1 コマンドで確認できる | FR-3 |
| 未改変は従来どおり収束、改変は無言で上書きされない（eval 検証付き） | FR-2 + FR-5 |
| 非対話 1 コマンドと冪等性の維持 | FR-4.1 + FR-5.1(d) |
| README（英日）に更新戦略 | FR-6.1 |
