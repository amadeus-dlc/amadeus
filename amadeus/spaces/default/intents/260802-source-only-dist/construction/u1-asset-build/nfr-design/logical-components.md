# Logical Components — u1-asset-build

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は engine nfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一存在する `business-logic-model` の責務列をfallback入力として実装境界へ落とす。

## コンポーネント境界

| Component | 所有責務 | 入力 | 出力 / 失敗境界 |
|---|---|---|---|
| `DistTreeDiscovery` | `scripts/package.ts` の `discoverHarnessNames` を介した canonical harness 集合取得 + `plugins` を加えた wrapper 直下ディレクトリ集合の確定 | generated `dist/` | `{harnesses}`(= wrapper 直下集合、BR-U1-3 schema のフィールドのみ)/ 不在・重複で失敗 |
| `DeterministicArchiveWriter` | wrapper 配下への名前順 tar.gz | harness tree、version | tar / path escape・I/O失敗 |
| `ArtifactDigest` | SHA-256 streaming計算 | 第1段tar、第2段manifest | 各digest / I/O失敗 |
| `ReleaseManifestBuilder` | schema 1 manifest 構築 | version、tar metadata、harnesses | JSON / 不正 version で失敗 |
| `DistAssetVerifier` | 集合・件数・digest の cross-check | tar、manifest、SHA256SUMS | verified set / 不一致で失敗 |
| `ReleaseWorkflowAdapter` | build/test/repro/upload の順序付け | fixed SHA | GitHub artifact / step 非0 |

## 隔離と blast radius

`scripts/release-dist.ts` は上記の最初の5責務を純粋な library 関数と薄い CLI handler に分け、GitHub API へアクセスしない。`ReleaseWorkflowAdapter` だけが workflow permission と外部 Action を持つ。これにより archive ロジックの欠陥は一時成果物へ、upload 障害は当該 release run へ blast radius を限定する。

共有資源は generated `dist/` の read-only snapshot と一時ディレクトリのみ。固定 SHA checkout 後に source を更新せず、build と asset 生成の間で入力 tree が変わらないよう workflow の単一 job 境界に置く。

## Infrastructure Design への引き渡し

追加の AWS resource、daemon、database、cache は不要。必要な実行資源は GitHub Actions runner の CPU/disk、一時 artifact store、既存 GitHub Release permission である。Infrastructure Design ではこれらを N/A 根拠付きで確認し、クラウドサービスを追加しない。
