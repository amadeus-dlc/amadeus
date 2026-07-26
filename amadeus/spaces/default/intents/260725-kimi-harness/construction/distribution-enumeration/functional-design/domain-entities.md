上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Domain Entities — distribution-enumeration

requirements.md の FR-5/FR-6 と components.md C5 をエンティティとして定義する。

## Entity: HarnessEnumeration(3閉集合)

- `PACKAGE_HARNESSES`(plugin-projection・promote-self): 全 dist 面。6 → 7(kimi 追加)
- `SELF_INSTALL_HARNESSES`(plugin-projection): セルフインストール面。4 → 5(kimi 追加)
- swarm `HARNESS_VALUES`: U4 で 4 → 5(kimi 追加済み)
- 3集合は意図的に非対称で、kimi は全てに入る(codekb architecture の現行節の非対称表どおり)

## Entity: SetupHarnessName

- union に `"kimi"` を追加し、`HarnessName.all`・parse・`engineDirNameFor`(kimi → `.kimi-code`)・reporter の文字列が一貫する

## Entity: SelfInstallTree

- ルート `.kimi-code/`(promote-self の managedDirs で `dist/kimi/.kimi-code` から生成)
- `.kimi-code/VERSION`・`amadeus/active-space` 等の workspace shell を含む

## 適用範囲

- U5 の完了定義(unit-of-work.md)と unit-of-work-story-map.md の FR-5/FR-6 行に対応
- services.md の判定(実行単位は短命)により、エンティティ間の共有状態は導入しない
- component-methods.md は C5 のメソッド節を持たないため参照しない(列挙変更は新規インターフェースを伴わない)

## 関係

- HarnessEnumeration --生成対象化--> dist/kimi(既に B1 で生成)--promote-self--> SelfInstallTree
- SetupHarnessName --受理化--> setup CLI の install/upgrade/verify
