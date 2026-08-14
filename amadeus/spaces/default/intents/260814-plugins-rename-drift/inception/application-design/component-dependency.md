# Component Dependency — 260814-plugins-rename-drift

上流入力: `components.md` C1〜C6、codekb `architecture.md` 260814 節(P1〜P5 の患部依存)。

## 依存マトリクス

| 依存元 → 依存先 | C1 改名 | C2 宣言パーサ | C3 config キー | C4 解決・受け渡し | C5 git-drift | C6 検証面 |
|---|---|---|---|---|---|---|
| C1 改名 | — | なし | なし | なし | なし | 検証される |
| C2 宣言パーサ | なし | — | なし | 消費される | 宣言を提供 | 検証される |
| C3 config キー | なし | なし | — | 消費される | override を提供 | 検証される |
| C4 解決・受け渡し | なし | 宣言を読む | override を読む | — | 引数を渡す | 検証される |
| C5 git-drift | なし | 宣言する | (間接) | 引数を受ける | — | 検証される |
| C6 検証面 | 検証する | 検証する | 検証する | 検証する | 検証する | — |

- **C1 は C2〜C5 と独立**(実装依存なし — Bolt 分割の根拠。ユーザー指示により順序のみ C1 先行)。
- **C5 は C2/C3/C4 に依存**(settings の実消費者)。同一 intent 要件(先行着地禁止)により C2〜C4 と C5 は同 intent 内で揃える。Bolt を分ける場合も C2〜C4 → C5 の順(delivery-planning 段で確定)。

## 通信パターン

- すべて同期・単発 CLI spawn(process boundary)。プラグイン → core の import は禁止(本 intent の ADR-6 に採録 — 正本は `scripts/import-closure-guard.ts` の fail-closed ガード。プラグイン外へ出る import は `missingFromManifest` として投影が write-0 で拒否される)。
- C4 → C5: argv(`--settings-json`)による一方向データ渡し。C5 から core への逆流なし(audit 記録は sensor dispatcher 側が所有)。
- C5 → git: `git fetch` / `rev-list` / `diff` / `status` の read + remote-tracking ref 更新のみ。repo の作業ツリー・index・ブランチは一切変更しない。

## データフロー

```
plugin.json settings 宣言(C2 が parse)──┐
amadeus/config.json plugin.settings(C3 が parse)──┤→ C4 解決(宣言 default ← project ← space ← intent)
                                                    └→ argv → C5 → DriftReport → audit(advisory)
```

## 共有リソース

- `.claude/sensors/` 直下(git-drift センサー md が pr-convergence 供給分と同居 — 名前空間なし、id 衝突は graph compile が検出)
- `amadeus/config.json`(C1 の同期対象かつ C3 の読取先 — 同一ファイルだが触るキーは相互排他: C1 = activation.names 要素 + scope-bindings 外側キー、C3 = plugin.settings 新キー)
- スロットル時刻の機械ローカル記録(gitignored `.amadeus-*` 系 scratch — 台帳・record への書込はしない)
