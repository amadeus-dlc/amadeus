# Component Dependency — 260816-open-bug-batch-7

## Unit 間依存

なし。3 Unit(pi-distribution / nsd-provenance / sensor-docs-sync)は相互にファイル交差がなく(codekb `code-structure.md` の patch surface 配置を実測根拠とする)、並行実装可能。着手順序の制約もない。

## Unit 内の依存方向(テキスト図)

```
[C-PI]
  self-install-allowlist.ts (GENERATED_SELF_INSTALL_ROOTS)
      └─(機械生成)→ .gitignore / .gitattributes
  plugin-projection.ts (SELF_INSTALL_HARNESSES) ─→ プラグイン投影対象の解決
  promote-self.ts (managedDirs) ─→ dist/pi/.pi → .pi のコピー
  ※ 3 定義は独立に消費される(単一正本化は out of scope — requirements.md)

[C-NSD]
  no-silent-drop-gate.test.ts / t427 ─→ bootstrap.ts (loadTrustedPreviousLedgers)
  bootstrap.ts ─→ ledger.ts (CANONICAL_PATHS / events 読出)
  退役後: bootstrap.ts の依存は events 台帳のみ(provenance / baseline 依存はゼロに)

[C-SEN]
  t3028 ─→ docs/reference/07-sensor-system.md(.ja) の表
  t3028 ─→ センサー実在コーパス(core sensors/ + plugins */plugin.json)
```

## 共有資源

- 横断台帳(`tests/.coverage-registry.json` 等)は各 Unit の PR が自分の変更分を個別に resync する(cid:build-and-test:bt-ledger-resync / c1)。Unit 間で同一台帳の同一行を触る見込みはないが、マージ順による regen 差分は後着 PR 側で再実行して吸収する
- `packages/framework/core/` 正本を触るのは C-PI のみ(self-install-allowlist.ts)。build 再生成の影響も C-PI に閉じる
