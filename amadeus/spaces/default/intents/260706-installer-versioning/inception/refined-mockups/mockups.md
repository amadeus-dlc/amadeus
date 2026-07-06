# Mockups — 260706-installer-versioning（Issue #543）

上流入力: [wireframes.md](../../ideation/rough-mockups/wireframes.md)、[user-flow.md](../../ideation/rough-mockups/user-flow.md)、[requirements.md](../requirements-analysis/requirements.md)、[stories.md](../user-stories/stories.md)

rough の骨子を実装確定様式へ精緻化する。以下の文字列・スキーマを functional-design と実装の正とする。

## 1. manifest スキーマ（`<target>/.amadeus-install.json`、FR-1）

```json
{
  "installedAt": "2026-07-06T09:30:00Z",
  "sourceCommit": "e535ad89f3c1...40 桁 hex または unknown",
  "hashAlgorithm": "sha256",
  "files": {
    "<target 相対 path>": "<sha256 hex 64 桁>"
  }
}
```

- キーは上記 4 個のみ（拡張は将来 Intent）。files のキーは POSIX 区切りの target 相対 path、辞書順で書き出す（diff 安定性）。
- files の値は「配布時に書き込んだ内容」の sha256 とする: AMADEUS.md は変換後、settings.json は merge 後の書き込み内容の値（FR-1.1、C-7）。
- 除外: manifest 自身、`.amadeus-install-backup/` 配下（FR-1.2）。

## 2. 更新実行の出力（FR-2.3、FR-3.3。US-1〜5 の観測点の正）

ステップ構成は実装の実態（scripts/amadeus-install.ts 511〜530 行、runStep 1〜4 + smoke）そのまま: `engine`（AMADEUS.md の変換書き込みを内包）、`skills`、`symlinks`、`settings`、`smoke`。新ステップは追加しない。

```text
amadeus-install: installing into <target>
amadeus-install: previous install found (commit <c8>, <installedAt>)
[1/5] engine        7 dirs copied (2 customized backed up, 1 deleted restored)
[2/5] skills        39 skills synced (1 customized backed up)
[3/5] symlinks      7 links relinked
[4/5] settings      hooks wiring merged
[5/5] smoke         doctor check passed
amadeus-install: 4 customized file(s) backed up to .amadeus-install-backup/<time>/
amadeus-install:   backed up: <target 相対 path>（退避ファイルごとに 1 行。計 4 行）
amadeus-install: 1 of the above is obsolete (removed from the new distribution)
amadeus-install: 1 deleted file(s) restored (per manifest)
amadeus-install: done. Next: see README "導入後の検証" (doctor / amadeus-validator)
```

- `previous install found` 行は manifest 存在時のみ（FR-3.3）。`<c8>` = sourceCommit 先頭 8 桁（unknown の場合は `unknown`）。
- sourceCommit 取得不能の告知（第 5 節）は `installing into` 行の直後（previous install 行の前）に出す。
- ステップ行 detail の括弧内は該当があるときだけ付く（改変・削除ゼロなら従来 detail のまま = US-3）。ステップ行 detail の件数は当該ステップが書き込む path 群に対する退避・再作成の件数（FR-2.3 前段）。
- 件数集計ルール: summary ヘッダの件数は退避の総数（コピー段階由来 + 廃止ファイル由来の合計。例では 2+1+1=4）で、backed up 列挙行の本数と常に一致する。FR-2.6 の廃止ファイル退避はコピー段階に属さないためステップ行 detail には出さず、内数を示す summary 行（`N of the above is obsolete ...`）で告知する。退避先は同じ時刻 dir。
- summary 行は該当があるときだけ出す。順序は backed up ヘッダ + 列挙 → obsolete 内数 → restored 件数。
- bootstrap（manifest 不在）では `previous install found` の代わりに `amadeus-install: no previous manifest — treating differing files as customized (conservative bootstrap)` を 1 行出す。

## 3. 版確認の出力（FR-3.1〜3.2）

```text
$ bun run scripts/amadeus-install.ts --target <ws> --version-info
amadeus-install: installed commit <c8> (installed at <installedAt>, <N> files tracked)
```

- manifest 不在は exit 1（stderr）とする。先行事例（`rpm -q` / `dpkg -s` は未導入で非 0）と Unix 慣行に合わせ、CI は `--version-info || <導入する>` の形で分岐できる:

```text
amadeus-install: no install manifest found (pre-versioning install or not installed)
  fix: run the install command once — it records a versioned manifest (existing files are backed up if they differ)
```

- `--version-info` 単独（--target なし）は既存 dieUsage と同形式の usage エラー（exit 1、stderr）。

## 4. 退避 dir 構造（FR-2.2）

```text
<target>/.amadeus-install-backup/
  2026-07-06T09-30-00Z/            # 実行ごとの時刻 dir（ISO 8601 の ":" を "-" 置換）
    AMADEUS.md                     # target 相対 path を保存
    .agents/skills/amadeus-grilling/SKILL.md
```

## 5. sourceCommit 取得不能時の告知（確定 5）

```text
amadeus-install: source commit unknown (not a git checkout) — manifest records "unknown"
```
