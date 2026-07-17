# Logical Components — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../nfr-requirements/performance-requirements.md`(P-2)、`../nfr-requirements/security-requirements.md`(S-2 信頼域)、`../nfr-requirements/scalability-requirements.md`(N/A)、`../nfr-requirements/reliability-requirements.md`(RL-4 縮退)、`../nfr-requirements/tech-stack-decisions.md`(配置)、`../functional-design/business-logic-model.md`(ワークフロー)。2026-07-17。

## 論理コンポーネント目録(C1〜C5 既決構成の NFR 面ビュー)

| コンポーネント | 障害ドメイン | blast radius | 分離機構 |
|---|---|---|---|
| C1 entrypoint(plugin 殻) | plugin プロセス空間 | plugin 内のみ — 例外は catch され opencode へ漏れない(R-1) | try/catch 全周+advisory 契約 |
| C2 写像 lib(純関数) | plugin プロセス空間(C1 と同一) | 同上 — さらに I/O なし(P-3)につき副作用ゼロ | 純関数境界(検証は reconstruct 集約 — security-design) |
| C3 写像対応表 | 静的成果物(実行時障害なし) | なし(文書+frozen リテラルの導出元) | 工程0 凍結 |
| C4 テスト | CI/ローカル実行のみ | 本番配布物に含まれない | tests/ 層分離(ADR-4) |
| C5 manifest+docs | ビルド時のみ | regen 経路(dist:check が drift を loud 検出) | 生成物ガード(R-7) |
| (参照)core hooks 11本 | 独立サブプロセス | 非0 exit は plugin に記録されるのみで伝播しない | プロセス境界(spawn) |
| (参照)opencode 本体 | 最外殻 | plugin のいかなる失敗からも隔離(advisory 契約) | plugin API の返り値無変更 |

## 障害ドメイン3分離(DQ-4 回答の設計確定)

```
[opencode 本体] ←(advisory: 返り値で変更しない)─ [plugin 空間 C1+C2] ─(spawn)→ [core hooks サブプロセス]
     縮退時: plugin 全損 → hooks なし運用(現状)へ自然縮退(RL-4)— 検知機構不要
```

## 共有リソースの特定

- **audit シャード**(`<record>/audit/*.md`): 唯一の共有リソース。書き手は core hooks(ツール所有 emit — C-2)のみで、plugin は直接触れない — 本 unit の変更面外(AC-2b)。plugin の多重イベントによる同時 spawn が起きても、シャードのロックは core hooks 側の既存機構(mkdir ロック)が処理する
- 新規の共有状態・ファイル・ポートは導入しない(インフラ設計へ渡す新規コンポーネントなし — infrastructure-design は本スコープ SKIP と整合)
