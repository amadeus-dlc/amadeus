# Business Rules — u1-asset-build

上流入力(consumes 全数): requirements(FR-1.1〜1.4 — 各 BR の要求元)、component-methods(C1 契約)、components(C1 規模・Reuse)、services(公開境界)、unit-of-work(受け入れ対応 u1=FR-1)、unit-of-work-story-map(Slice 1 出荷判定)。

## ルール一覧

- **BR-U1-1(命名)**: asset は `amadeus-dist-v<version>.tar.gz`、checksum は `SHA256SUMS`(sha256sum -c 互換書式)、manifest は `amadeus-dist-v<version>.manifest.json`。wrapper ディレクトリ名は `amadeus-dist-v<version>/`(ADR-A2)
- **BR-U1-2(決定性)**: tar エントリはパス名の辞書順、mtime = 固定エポック、uid/gid = 0、uname/gname = 空。gzip は決定的設定(mtime 0)。同一 commit・同一 toolchain の2回生成は byte-identical(NFR-1)
- **BR-U1-3(manifest schema 1)**: `{ schema: 1, version: "<semver>", tarball: "<basename>", sha256: "<hex64>", sizeBytes: <int>, harnesses: ["claude", ...], fileCount: <int> }`。将来フィールドは後方互換追加のみ(ADR-A2/A9)
- **BR-U1-4(self-check、fail-closed)**: 生成直後に manifest.harnesses ⇔ tar 実体トップ配下ディレクトリ集合、manifest.fileCount ⇔ tar エントリ数を照合。不一致は非0 exit(NFR-5 — 検証劇場禁止: 照合は tar 実体の再読取から導出)
- **BR-U1-5(release.yml 骨格不変)**: workflow_dispatch 一本・dry-run スキップ・App トークン(permission-contents: write)の各既存契約を変更しない(project.md Mandated)。追加は `build-dist` ジョブと `files:` のみ
- **BR-U1-6(asset 生成前の検証)**: フルテスト+再現性検査(隔離2回 build 比較)を build-dist ジョブ内で asset 生成より前に実行(FR-1.4)
- **BR-U1-7(ハーネス集合の導出)**: 同梱ハーネスは discoverHarnessNames の実測結果から導出し、リストをハードコードしない(count-comment-sync 系規範)
- **BR-U1-8(E2E 検証チャネル)**: 受け入れの実証は draft release(または prerelease)で行い、正式 Release チャネルへは触れない。draft の後始末は人間へ報告のうえ削除(external-dependency-map)

## 受け入れ基準との対応

| BR | requirements AC |
|---|---|
| BR-U1-1/3 | FR-1.1(単一 tar + checksum + manifest 公開) |
| BR-U1-2 | NFR-1(隔離2回生成 byte-identical) |
| BR-U1-4 | NFR-5(asset 生成面の機械検査) |
| BR-U1-5 | FR-1.3(workflow_dispatch 一本維持) |
| BR-U1-6 | FR-1.4 |
| BR-U1-7 | 明示 FR なし — component-methods C1 の Reuse Inventory 由来の設計規則(受け入れ判定はハーネス追加時に manifest.harnesses が自動追随するテストで行う) |
| BR-U1-8 | Slice 1 出荷判定(G10) |
