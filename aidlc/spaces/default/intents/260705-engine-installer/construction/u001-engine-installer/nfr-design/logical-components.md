# Logical Components — u001-engine-installer（260705-engine-installer）

上流入力: [components.md](../../../inception/application-design/components.md)、[reliability-design.md](reliability-design.md)

## 論理構成（NFR 観点の再掲理）

| 層 | コンポーネント | NFR との対応 |
|---|---|---|
| 入口 | cli + preflight | REL-3（エラー整形と exit code）、FR-1.1 |
| 宣言 | manifest | SEC-3（非対象の構造的排除）、拡張点の一元化 |
| 配置（全置換） | copyEngine / placeAmadeusMd / copySkills | REL-1（冪等。rm+cp は再実行で収束。衝突検査は持たず REL-2 の対象外 = FR-1.8 の保証範囲どおり）、SEC-2（書き込み境界） |
| 配置（衝突検査あり） | relinkClaude | REL-1、REL-2（lstat の書き込み前検査 = 非破壊中断）、SEC-2 |
| 設定 | mergeSettings | REL-1 / REL-2、SEC-3（hooks 限定） |
| 検証 | smoke + 専用 eval | REL-4（偽陽性排除）、FR-2 系全項目 |

application-design の構成（単一ファイル + 責務別関数群）を変更する NFR 起因の理由はない。
