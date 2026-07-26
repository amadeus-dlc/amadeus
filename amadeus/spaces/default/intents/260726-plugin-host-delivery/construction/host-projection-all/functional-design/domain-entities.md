# Domain Entities — U3 host-projection-all

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> U2 が claude 面で確立した projector 骨格(projectPluginForHarness — component-methods.md C3)を全対応面へ一般化する型。UI なし(services.md — frontend-components.md 非該当につき不生成)。クラス literal は ADR-4 正準 3 値(`native-manifest | folder-drop-auto | manual-only`)を逐語使用。

## HarnessProjectionSpec(面ごとの投影仕様 — U1 マトリクスから導出)

| フィールド | 型 | 制約 |
|---|---|---|
| harness | 7 値 union(U1 domain-entities の HarnessCapabilityRow.harness と逐語同一) | — |
| clazz | `"native-manifest" \| "folder-drop-auto" \| "manual-only"` | U1 マトリクスの確定値からの転記(推論禁止 — BR-U1-7 の機械可読列挙が源) |
| layout | 生成物レイアウト(manifest 相対パス・hook snippet の有無・手順書) | クラスで決まる(component-methods.md C3 の 3 分岐) |
| tokens | ハーネス固有トークン置換表 | 既存 harness-transform の置換系を再利用(ADR-5) |

## ProjectionResult(判別 union)

```
type ProjectionResult =
  | { kind: "projected"; harness: string; files: readonly string[] }
  | { kind: "noop-zero-plugin" }                                    // 0-plugin: セクション全体 no-op(byte-identical)
  | { kind: "refused"; reason: OutDirRefusal }                      // plan 段拒否(mutation 不到達)
```

## OutDirRefusal(ADR-5 拒否集合 — 上流 t188 #27-32 と 1:1)

```
type OutDirRefusal =
  | { case: "non-projection-nonempty-dir" }   // #27 既存投影でない非空 dir
  | { case: "foreign-projection" }            // #28 FOREIGN checkout(非 amadeus 名)
  | { case: "file-outdir" }                   // #29 file パス(生 ENOTDIR stack を出さない)
  | { case: "symlink-outdir" }                // #30 symlink(plain / trailing-slash とも)
  | { case: "broken-symlink-outdir" }         // #31 破損 symlink(生 EEXIST stack を出さない)
// #32(真正な先行投影の上書き許可)は refusal ではなく projected 経路の前提条件
```

## DriftEntry(--check 編入 — stale / orphan)

| フィールド | 型 | 備考 |
|---|---|---|
| path | string | dist/plugins/ 配下 |
| kind | `"stale"`(正本より古い)\| `"orphan"`(正本に対応なし) | requirements FR-2 合否の --check 検出対象 |

## 不変条件

- 全対応面の投影は同一の中立正本から派生(単一正本 — ADR-5)。面別の手書きテンプレ複製を作らない
- manual-only 面にも layout(手順書+手動 compose 1 コマンド)は生成する — 投影ゼロの面を作らない(silent skip 禁止の投影面)
- 0-plugin build は現行 baseline と byte-identical(FR-2 合否 — hash 比較)
