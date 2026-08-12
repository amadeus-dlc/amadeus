# Security Design — control-byte-gate(Issue #2814)

上流入力(consumes 全数): business-logic-model.md(処理フロー7段と in-process seam — 本設計の対象面)。条件解決で除外された consumes: nfr-requirements 系5成果物(performance/security/scalability/reliability/tech-stack)— self-feature スコープで nfr-requirements ステージが SKIP のため不在(設計上の期待どおり)。NFR の正本は requirements.md の NFR-1〜4 を用いる。

## 脅威と対策

| 脅威 | 対策 |
|---|---|
| 悪意ある/事故的な制御バイト混入(本 intent の主題) | ゲート自体が対策(検出面)。CI blocking で PR 段遮断 |
| allowlist の悪用(バイナリ偽装での検査回避) | エントリは path 完全一致+reason 必須+PR レビュー可視(ADR-2)。stale fail-closed |
| ゲートスクリプト自身への混入 | ゲートは自身も走査対象(tests/ は tracked — 自己適用) |
| 入力起因の DoS(巨大ファイル) | CI step timeout 30s が上限。読取は tracked ファイルのみ(信頼境界内 — 任意外部入力を受けない) |

## 権限・シークレット

- シークレット・認証情報・ネットワーク不使用(NFR-4)。git 読取と FS 読取のみ(書込ゼロ — component-dependency.md)。
- 新規 CI ジョブに追加 permissions 不要(contents: read の既定で足りる — 実装時に workflow の permissions 宣言へ整合)。
