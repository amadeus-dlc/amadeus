# Wireframes — 260706-installer-versioning（Issue #543）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[scope-document.md](../scope-definition/scope-document.md)

CLI 機能のため、wireframe は「manifest の形」「更新実行の出力」「版確認の出力」の 3 様式スケッチとする。文言・フィールド名は Inception 以降で確定する（本ステージは骨子）。

## 1. 導入先 manifest（単一 JSON、案: `<target>/.amadeus-install.json`）

```json
{
  "installedAt": "2026-07-06T09:30:00Z",
  "sourceCommit": "e535ad89...",
  "hashAlgorithm": "sha256",
  "files": {
    ".agents/amadeus/tools/amadeus-state.ts": "3f2a...",
    ".agents/skills/amadeus/SKILL.md": "9c1b...",
    "AMADEUS.md": "77aa..."
  }
}
```

- files の値は「配布時に書き込んだ内容」の sha256（AMADEUS.md は変換後、協議 Q5 = コピー対象全ファイル一律）。
- 置き場は target 直下（amadeus/ 配下は不可侵 = C-4 のため置かない）。

## 2. 更新実行の出力

既存出力の実態（実測）: 起動と終了だけが `amadeus-install: ` prefix 行で、本体はステップ行 `[n/5] <label> <detail>`（runStep、489 行）である。退避の告知はステップ行の detail と、ステップ後の退避一覧行で行う。

```text
amadeus-install: installing into /path/to/workspace
amadeus-install: previous install found (commit b67798c3, 2026-07-05T22:30:00Z)
[1/5] engine        7 dirs copied (3 customized file(s) backed up)
[2/5] skills        39 skills synced
[3/5] AMADEUS.md    transformed and written
[4/5] settings      hooks wiring merged
[5/5] smoke         doctor check passed
amadeus-install: 3 customized file(s) backed up to .amadeus-install-backup/2026-07-06T09-30-00Z/
amadeus-install:   backed up: AMADEUS.md
amadeus-install:   backed up: .agents/skills/amadeus-grilling/SKILL.md
amadeus-install:   backed up: .agents/amadeus/knowledge/amadeus-shared/audit-format.md
amadeus-install: 1 deleted file(s) restored (per manifest)
amadeus-install: done. Next: see README "導入後の検証" (doctor / amadeus-validator)
```

- ステップ行の detail・件数表記は骨子であり、実際の文言は functional-design で確定する。
- 退避は無言にしない（末尾 summary へ必ず列挙 = 協議 Q3 + 無言の失敗禁止）。導入先で削除されていたファイルの再作成（協議 Q4）も件数を告知する。
- 改変・削除なしの通常更新では退避行・restored 行が出ない（従来出力と同一）。

## 3. 版確認の出力（案: `--version-info` flag または `version` subcommand。様式は同一）

```text
amadeus-install: installed commit b67798c3 (installed at 2026-07-05T22:30:00Z, 199 files tracked)
```

- manifest 不在（未導入 or 旧版導入）の場合は、既存実装のエラー規約（`fix: ...` で次の一手を明示、runStep 496〜497 行ほか）に合わせてヒントを添える:

```text
amadeus-install: no install manifest found (pre-versioning install or not installed)
  fix: run the install command once — it records a versioned manifest (existing files are backed up if they differ)
```

## 様式の原則

- 起動・終了・summary 系の行は既存の `amadeus-install: ` prefix、本体は既存の `[n/5]` ステップ行形式を踏襲する（#451 の実装様式。prefix 行が「すべて」ではない）。
- エラー・不在系のメッセージは既存の `fix: ...` 規約で次の一手を明示する。
- 対話プロンプトは一切出さない（C-1）。
