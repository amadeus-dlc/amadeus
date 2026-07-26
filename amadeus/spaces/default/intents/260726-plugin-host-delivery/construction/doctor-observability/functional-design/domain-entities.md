# Domain Entities — U5 doctor-observability

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> U2 が最小定義した DoctorLine を全面契約へ拡張する(cross-unit-type-canonical-lift: **U2 domain-entities の DoctorLine が正本** — 本書は追加フィールドを申告付きで拡張し、既存フィールドの再定義・改変をしない)。UI なし(services.md — frontend-components.md 非該当につき不生成)。

## DoctorLine(U2 正本の拡張 — 追加フィールドのみ)

U2 正本: `plugin: string` / `state: "ok"|"drift"|"degraded"|"advisory"` / `detail: string`。U5 は state へ **`"recovery-pending"`** を申告付きで追加拡張する(PluginDiagnostic.status の実測 3 値 `composed|drift|recovery-pending` — scripts/plugin-composition.ts:224 — のうち recovery-pending の写像先。U2 正本への追記は cross-unit-type-canonical-lift の申告付き整合として U2 側 domain-entities にも同時反映)。U5 で追加:

| 追加フィールド | 型 | 制約 |
|---|---|---|
| revision | number \| null | composition record の revision(未 compose は null) |
| droppedSurfaces | readonly string[] | drop された未対応 surface の列挙(requirements FR-5 — silent drop 不可視の禁止)。**投影元は DropsRecord(下記 — 新設永続物)であり、diagnosePlugins の現行戻り値には存在しない** |

## DropsRecord(新設永続物 — 書き手の申告)

compose 適用時に engine が書く drops 記録(composition record 隣接、上流 t188 の drops file 相当 — FR-4(d)「未解決 anchor は dropped-with-log」の受け皿)。**書き手 = compose 経路(U2 で骨格新設 — claude 面では通常空、anchor drop 発生時に記録。U4 が非対応面の degrade エントリを追加)。U5 は読むだけ**。

| フィールド | 型 | 備考 |
|---|---|---|
| plugin | string | プラグイン別に分離(t188 #24 — 他プラグインの drops を消さない) |
| entries | readonly { surface: string; severity: "degraded" \| "advisory"; reason: string }[] | severity が DoctorLine の degraded/advisory 表示の唯一の源 |

## DoctorPluginSection(--doctor 出力の plugin 節)

| フィールド | 型 | 制約 |
|---|---|---|
| installed | number | 発見されたプラグイン数(diagnosePlugins 由来 — 新カウントを発明しない) |
| composed | number | compose 済み数 |
| lines | readonly DoctorLine[] | プラグインごと 1 行 |
| activation | ActivationJudgment 表示行 \| null | U6 の判定の表示のみ(判定ロジックは U6 所有 — 本 Unit は表示責務) |
| exitContribution | `"pass" \| "fail"` | degraded が 1 件でもあれば fail(doctor 全体集約へ伝播 — component-methods.md C5) |

## 表示規約(requirements FR-5 / 上流 t188 #21-22 相当)

- `[degraded]` 行 → doctor 全体 FAIL に寄与
- `[advisory]` 行 → PASS(advisory) — FAIL に寄与しない
- 0-plugin 時は節自体を「Plugins: 0 installed」の 1 行に縮退(既存 doctor 出力の他行へ影響ゼロ)

## 不変条件

- 全フィールドは diagnosePlugins / composition record / U6 判定の既存戻り値からの**射影のみ**(新判定・新走査を doctor 側に作らない — Reuse Inventory)
- 表示は読み取り専用(doctor 実行が record・host bytes を変更しない)
