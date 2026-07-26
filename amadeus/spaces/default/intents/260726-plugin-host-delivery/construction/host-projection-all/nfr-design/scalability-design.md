# スケーラビリティ設計 — U3 host-projection-all

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、business-logic-model、tech-stack-decisions
> 技術前提(Bun 単独・runtime dependency 追加ゼロ・新規外部依存なし)は同 unit の tech-stack-decisions の決定を継承する。

## SCALE-U3-1 への設計: 面数線形のマトリクス駆動ループ

`scalability-requirements.md` SCALE-U3-1 のとおり、投影は `business-logic-model.md` フロー 1 の `HarnessProjectionSpec[]`(U1 マトリクス BR-U1-7 の機械可読列挙からの構成)を単純 for ループで独立処理する設計とする:

- 面ごとの処理は「outDir 検査(`security-requirements.md` SEC-U3-1)→ 投影 → hash 記録」で完結し、**面間の共有可変状態を持たない**(spec 配列は readonly、結果は面別 `ProjectionResult` の収集)。面追加 = spec 1 要素追加であり、コード変更はクラス分岐(下記)に閉じる
- クラス別 3 分岐(component-methods.md C3: claude=native-manifest / folder-drop-auto / manual-only)は `HarnessProjectionSpec.clazz` の判別 union switch 1 箇所に集約し、面別の if 分岐散在を作らない。7 面まで増えても分岐数はクラス数(3)で一定 — 面数と分岐複雑度を分離する
- U2 新設済みの claude projector は変更しない(`business-logic-model.md`「残面の layout 分岐を追加する」)— 既存面の挙動へ影響しない加算的拡張

## SCALE-U3-2 への設計: プラグイン数線形の走査

`scalability-requirements.md` SCALE-U3-2 のとおり、投影・`--check` ともプラグイン数×面数の単純二重ループとする。`performance-requirements.md` PERF-U3-2 と同じく hash 比較は write 側と共有(`reliability-requirements.md` REL-U3-2)、orphan 検出は `dist/plugins/` の 1 パス列挙。索引・キャッシュ・並列投影は導入しない(A-3 少数前提 — スコープ外機構の先行実装禁止)。

## 非該当カテゴリ

N/A — `scalability-requirements.md` 非該当カテゴリ(水平スケーリング / 同時実行制御)の N/A を参照継承(ビルド時単発実行)。
