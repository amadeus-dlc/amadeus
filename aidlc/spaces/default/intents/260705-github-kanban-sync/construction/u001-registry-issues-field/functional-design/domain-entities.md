# Domain Entities — u001-registry-issues-field

上流入力: [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md)

## RegistryEntry（既存 + 追加フィールド）

`intents.json` の 1 entry。U001 で追加するのは `issues` だけである。

```ts
type RegistryEntry = {
  uuid: string;          // 既存: UUIDv7（正準 ID）
  slug: string;          // 既存
  dirName?: string;      // 既存・任意: <YYMMDD>-<label>（表示名）。back-compat のため省略可（amadeus-lib.ts IntentRegistryEntry と同形）
  scope?: string;        // 既存・任意: 同上
  status: string;        // 既存
  repos?: string[];      // 既存: 省略時は [] と同義
  issues?: number[];     // 追加: GitHub Issue 番号。省略時は [] と同義（BR-1、BR-2）
};
```

## 例

```json
{
  "uuid": "019f2fee-a630-73f5-a90d-16c78a42bc6c",
  "slug": "github-kanban-sync",
  "dirName": "260705-github-kanban-sync",
  "scope": "feature",
  "repos": [],
  "status": "in_progress",
  "issues": [470]
}
```
