# Code Generation Plan — u1-asset-build

## 実装方針

- スコープ分類は `self-feature`。対象は決定的な Release Asset builder と既存 release workflow の配線に限定する。
- asset の生成順序は非循環な `tar → tar digest → manifest → manifest digest → SHA256SUMS` とする。
- manifest schema は BR-U1-3 の `schema`、`version`、`tarball`、`sha256`、`sizeBytes`、`harnesses`、`fileCount` の7フィールドだけを持つ。
- `dist/` は読み取り専用入力とし、手編集・再生成・stage を行わない。ハーネス集合は `scripts/package.ts` の `discoverHarnessNames` から導出し、存在する `plugins` tree を同じ payload root 集合へ加える。
- release workflow の `workflow_dispatch`、dry-run、GitHub App token の権限境界は維持する。

## Blast Radius

| 変更面 | 影響 | 既存 consumer / 検証 |
|---|---|---|
| `scripts/package.ts` | 低: discovery 関数の export のみ | 既存 package CLI と package tests |
| `scripts/release-dist.ts` | 新規・局所: repo-only asset builder | release workflow、Unit/Integration/E2E tests |
| `.github/workflows/release.yml` | 中: release job DAG と asset upload | `t223-release-bot-bypass`、workflow wiring test |
| `tests/unit/` | 新規 builder contract tests | Bun test runner / `tsconfig.tests.json` |
| `tests/integration/` | 新規 CLI・workflow boundary tests | Bun test runner |
| `tests/e2e/` | 新規 artifact round-trip test | Bun test runner |

## 実装ステップ

- [x] **Step 1: Unit 契約テストを先行作成する** — version parse、manifest の厳密7フィールド、決定的 tar.gz、tar 実体由来の harness/fileCount、checksum 2行、空/不正 dist、symlink/path escape、改竄 self-check、容量境界を赤で固定する。Trace: FR-1.1/1.2、NFR-1/3/5、BR-U1-1〜4/7、ADR-A2、Intent Slice 1。
- [x] **Step 2: Integration / workflow 契約テストを先行作成する** — CLI が fixture dist から3 assetを生成すること、既存 release workflow test を `build-dist` DAG・artifact upload/download・`files:` 3点・dry-run/App token 維持へ更新し、未実装状態で赤を実測する。Trace: FR-1.3/1.4、BR-U1-5/6/8、ADR-A3、NFR-4、Intent Slice 1。
- [x] **Step 3: E2E・NFR テストを先行作成する** — 同一 fixture を隔離2回生成して byte-identical を比較し、公開単位3点を `SHA256SUMS` で再検証する。security は symlink/`..`/不正 semver を fail closed、performance は disk headroom と archive size の境界を決定的な pure check で検証する。Trace: NFR-1/3/5、security-design、performance-design、reliability-design。
- [x] **Step 4: canonical harness discovery seam を公開する** — `discoverHarnessNames` を export し、新 builder が列挙を複製せず再利用できるようにする。既存 package 挙動は不変とする。Trace: BR-U1-7、component-methods C1、project Mandated。
- [x] **Step 5: 決定的 archive writer を実装する** — generated `dist/` を読み取り、単一 wrapper 直下へ harness/plugin tree を配置し、辞書順、mtime=0、uid/gid=0、空 owner/group、file=0644、directory=0755、ustar/PAXなし、gzip header mtime/filenameなしで streaming 生成する。symlink と wrapper 外 path は拒否する。Trace: FR-1.1/1.2、BR-U1-1/2、ADR-A2、reliability-design。
- [x] **Step 6: manifest/checksum/self-check を実装する** — tar digest・size・tar 再読取の harness/fileCount から厳密 schema 1 manifest を生成し、その digest 後に `SHA256SUMS` を2行で生成する。3 assetを再読取し、schema、digest、集合、件数を fail closed で検証後だけ最終出力へ昇格する。Trace: FR-1.1、NFR-3/5、BR-U1-3/4、security-design。
- [x] **Step 7: CLI 境界と資源 guard を実装する** — `--version <semver>` のみを受理する薄い handler、出力先の非空拒否、入力サイズ×3かつ512 MiBの disk headroom、1 GiB warning / 1.8 GiB fail を実測値で判定する。Trace: NFR-3、performance-design、scalability-design、reliability-design。
- [x] **Step 8: release workflow を配線する** — `build-dist` を固定 SHA checkout、Bun 1.3.13、install、正本 build、full test、隔離 reproducibility check、asset build、artifact upload の順で追加する。`github-release` は `[prepare, build-dist]` を needs に持ち、artifact download 後に3 files を添付する。dry-run は build/upload/release を明示 skip し、App token は release job のみに保つ。Trace: FR-1.3/1.4、BR-U1-5/6、ADR-A3、NFR-4。
- [x] **Step 9: 対象検証を実行する** — 新規 unit/integration/E2E、既存 release workflow test、lint、typecheck を実行し、必要に応じて cold timeout 対象だけ `bun test --timeout 120000 <file>` で再実行する。Trace: Comprehensive test strategy、NFR-1/3/5、Intent Slice 1。
- [x] **Step 10: 成果物と commit を閉じる** — 各完了直後に checkbox を `[x]` 化し、`code-summary.md` に変更・判断・実測 exit code・逸脱・残課題を記録する。入力/state/audit/runtime graph を除外して実装・テスト・本成果物だけを path 指定 stage し、Conventional Commit を作る。Trace: Code Generation stage、P2/P3/P5。

## Comprehensive Test Strategy

| 層 | 対象 | 主なケース | 要件/NFR |
|---|---|---|---|
| Unit | version、ustar header/path、manifest、digest、resource guard | happy path、invalid semver、symlink/path escape、改竄、disk/size境界 | FR-1.1/1.2、NFR-1/3/5 |
| Integration | `release-dist.ts` CLI + fixture dist、release.yml の job/step DAG | 3 asset生成、checksum検証、dry-run skip、App token境界、artifact upload/download | FR-1.3/1.4、NFR-4/5 |
| E2E | fixture dist → tar.gz/manifest/SHA256SUMS → self-check | 隔離2回 byte-identical、wrapper layout、全 root と fileCount の round-trip | Slice 1 の u1 部分、NFR-1/5 |
| Performance | pure resource guards + streaming implementation inspection | disk headroom、1 GiB warning、1.8 GiB fail、全tar一括読込なし | performance/scalability design |
| Security | trust-boundary rejection + checksum verification | semver path injection、symlink、absolute/`..` entry、tar/manifest改竄 | NFR-3、security design |

## Test Configuration

- Runner: Bun 1.3.13 / `bun:test`。既存 `tsconfig.tests.json` を使用し、新規 runner config は追加しない。
- Unit: `bun test tests/unit/t-release-dist.test.ts`
- Integration: `bun test tests/integration/t-release-dist-cli.integration.test.ts tests/integration/t223-release-bot-bypass.integration.test.ts`
- E2E: `bun test tests/e2e/t-release-dist.e2e.test.ts`
- Static quality: `bun run lint`、`bun run typecheck`
- Full regression は後続 Build and Test の責務。本 Unit では変更境界に直接対応する targeted suite と既存 release contract test を必須とする。

## 計画時点の逸脱・未決

- 設計逸脱なし。nfr-design に残る旧順序はユーザー指示により非循環 DAG を正とする。
- E2E の GitHub draft Release 作成は外部状態変更かつ人間承認境界のため本 delegated Unit では実行しない。ここでは公開直前までの local artifact round-trip を実証し、draft Release 実証は Bolt 1 の u1→u2 統合ゲートへ引き渡す。
