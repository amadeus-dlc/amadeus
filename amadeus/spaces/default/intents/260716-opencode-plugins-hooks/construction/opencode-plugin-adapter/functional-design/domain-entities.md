# Domain Entities — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(U1)、`../../../inception/units-generation/unit-of-work-story-map.md`(FR→U1)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜5)、`../../../inception/application-design/components.md`(C1〜C5)、`../../../inception/application-design/component-methods.md`(公開 API)、`../../../inception/application-design/services.md`(境界)。2026-07-17。

## エンティティ(型 — functional-domain-modeling-ts スタイル、class-free)

| 型 | 構造(案 — cursor-lib 同型) | ライフサイクル |
|---|---|---|
| `MappingTableRow`(工程0 成果物の行) | `{ target: string; opencodeHook: string \| null; status: "wired" \| "conditional" \| "unsupported"; evidence: string }` の3値判別 — 文書表現(lib ヘッダコメント+record 収載)であり、どのコードも消費しない検証フィールドは持たせない(検証劇場回避) | 工程0 で凍結 → C2 実装の入力 → docs 機能表へ転記 |
| `Reconstruction` | `{ calls: CoreCall[] }` — 配線成功の証明を型で運ぶ(parse-don't-validate)。**意図的相違(明文照合)**: 引用元 cursor の型は `{ calls: CoreCall[]; forwardStdout: boolean }`(amadeus-cursor-lib.ts:77、session-start の additionalContext 注入 :107 用)だが、本設計は forwardStdout を**採らない** — opencode 側に同等のコンテキスト注入 seam が実測されておらず(external-seam-vocab-measurement: 未実測 seam へ確約しない)、ADR-3(返り値で opencode の動作を変更しない)の字義にも整合。工程0 実測で session 系配線が注入 seam を必要と確定した場合は**本型の再設計を工程0 の確定条件に含める**(⚠ — 無言の固定ではなく明示の scope-out) | reconstruct が構成 → spawn 消費で終端(単発イベント処理、永続化なし) |
| `CoreCall` | `{ hook: string; stdin: object }` — core hook 名+stdin JSON。具体フィールドは工程0 通過分のみ(⚠ 実装時確定) | Reconstruction 内で生成 → spawn 1回で消費 |
| `ReconstructError` | `{ error: string }` — Reconstruction との判別ユニオン(error フィールド有無) | 呼び出し元が stderr 記録して終端(advisory) |
| `ToolNameMap` | `Record<string, string>`(opencode tool 語彙 → core tool_name)— 実測確定値のみ(AC-2d)。frozen リテラル | 工程0 で確定 → 実行時 read-only |

## 関係と相互作用

```
MappingTableRow(工程0・静的)──凍結──▶ reconstruct の配線分岐+ToolNameMap の登録集合
opencode event(payload: unknown)──▶ reconstruct ──▶ Reconstruction | ReconstructError
Reconstruction.calls[] ──▶ spawn(.opencode/hooks/<hook>.ts, stdin)  ※1 CoreCall = 1 spawn
```

- 状態を持つエンティティはない — 全型が単発イベント処理内で生成・消費される値(永続化・キャッシュ・デーモンなし、services.md どおり)
- 無効状態の表現不能化: 未配線イベントは Reconstruction を構成できない(reconstruct が唯一の生成経路 — parse-don't-validate)。ToolNameMap に未実測語彙が入る経路は存在しない(工程0 凍結値の frozen リテラルのみ)
- カプセル化: machine 注入判定の写像・spawn ラッパは非公開(component-methods「内部」節どおり)。breachEncapsulationOf 系の公開なし
