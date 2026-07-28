# Domain Entities — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

型は component-methods の C0/C1/C3 を verbatim 正とする(独立進化させない — cross-unit-type-verbatim-check)。C1/C3 のモジュール割付(amadeus-mirror-config.ts / amadeus-mirror-lifecycle.ts への配置)は components の変更コンポーネント一覧に従う。U4 は新しいエンティティを導入せず、unit-of-work の U4 定義どおり設定の完全形と診断出力を既存型系へ**一般化・追記**する。requirements FR-5/FR-9 が値集合の根拠、services が権限・障害分類の前提。story-map ジャーニー4の可視化面。

## 消費・一般化する型(component-methods 正本)

| 型 | U4 での役割 |
|---|---|
| `MirrorProjectRef` / `MirrorProjectTarget` / `MirrorProjectStatusNames` / `MirrorPhaseKey`(C0) | `mirror-projects` 配列要素の parse 結果。`status-names` のキーは `MirrorPhaseKey` closed set(unknown phase 拒否の根拠型 — BR-U4-1) |
| `MirrorConfig`(C1) | `{ autoMirror: MirrorMode; projects: readonly MirrorProjectTarget[] }`(projects 既定 [])— 現行の `{ autoMirror }` 単独形(実装直読: amadeus-mirror-config.ts:41)からの closed-schema 拡張 |
| `MirrorProjectSyncEntry`(C0 — U2 完全形) | 部分成功検出(FR-9a (v))の read-only 入力。診断は台帳を変更しない(BR-U4-8) |
| `ExpectedProjectStatus`(C0) | 診断の期待 Status 導出(C2 canonical 共有 — FR-9c)。`keep` のとき drift 比較は非該当(期待なし) |

## projectDiagnostics entry(component-methods C3 のシグネチャを verbatim 採用)

```ts
{
  project: string;
  membership: "member" | "not-member";
  currentStatus: string | null;
  expectedStatus: string | null;        // expectedProjectStatus を共有消費(FR-9c)
  drift: boolean;
  resolution: "resolved" | "field-missing" | "option-missing" | "permission-denied";
  availableOptions?: readonly string[]; // option-missing 時の診断(FR-6c)
}
```

- `resolution` の4値は FR-9a (iii)(iv) の検出対象(フィールド不在 / 選択肢不在 / 権限不足)+正常系の閉じた分類。
- `availableOptions` は `option-missing` のときのみ意味を持つ(FR-6c の実在選択肢一覧)。他の resolution では省略 — 診断出力の秘匿規律(BR-U4-6)により生応答は転記しない。
- `expectedStatus: null` は `ExpectedProjectStatus` の `keep` 分岐(park 中等)に対応し、このとき `drift` は false 固定(期待が無いものはズレない)。

## 不変条件

- 期待 Status の文字列は `expectedProjectStatus` の出力のみから得る — 診断側で `DEFAULT_PROJECT_STATUS_NAMES` を直接参照・複製しない(FR-9c、canonical 1定義)。
- `projectDiagnostics` の生成は state・remote のどちらも変更しない(FR-9b — mutation 0 かつ台帳 write 0)。
- 設定の parse 失敗(issue 化)した層の値は診断にも使わない — 有効値を持つ最後の層(BR-U4-2)だけが診断・同期の両方の入力になる(同一の config 解決を共有し、診断専用の解決を作らない)。
