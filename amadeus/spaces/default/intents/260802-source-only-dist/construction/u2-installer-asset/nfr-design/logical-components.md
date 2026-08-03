# Logical Components — u2-installer-asset

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## コンポーネント

| Component | 責務 |
|---|---|
| `ArchiveSourceResolver` | semver境界の純粋分岐 |
| `AssetHttpClient` | allowlist付きredirect取得 |
| `ChecksumVerifier` | SHA-256 streaming照合 |
| `SafeTarExtractor` | traversal拒否展開 |
| `ExtractedPayloadLocator` | wrapper/dist→wrapper直下 |
| `InstallTransaction` | target原子置換 |

## 引き渡し

外部境界はGitHub Release HTTPSのみ。追加AWS resourceや常駐serviceはN/A。
