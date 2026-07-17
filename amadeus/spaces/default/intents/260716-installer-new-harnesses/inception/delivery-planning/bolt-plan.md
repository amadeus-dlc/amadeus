# Bolt Plan — installer-new-harnesses(Issue #1048)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜6)、`../user-stories/stories.md`(US 8本・MoSCoW)、`../refined-mockups/mockups.md`(出力契約 — usage/invalid 文言)、`../application-design/components.md`(C1〜C7)、`../units-generation/unit-of-work.md`(U1・embedded)、`../units-generation/unit-of-work-dependency.md`(エッジなし)、`../units-generation/unit-of-work-story-map.md`(全 US→U1)、`../practices-discovery/team-practices.md`(Branching / Walking Skeleton / Deployment の affirm 済み実践)。

## Bolt 列(1本)

### Bolt 1: installer-enum-extension【walking-skeleton(org 既定 — 唯一の Bolt として単独ゲート)】

- **含む Unit**: U1(installer-enum-extension)のみ — 1:1
- **walking-skeleton マーカー**: 有。org 既定(feature スコープ → skeleton first・単独ゲート・ユーザー明示承認)に従う。ただし本 intent は既存 installer への列挙拡張であり、証明すべき「層」は新規アーキテクチャではなく既存 8サイト+テスト+配布経路の end-to-end 貫通(install→verify 完走)
- **Definition of Done**:
  1. FR-1 の 8サイト(harness.ts / engine-layout.ts / reporter.ts / 契約テスト2本)が 6値化され、AC-1e(追加ロジックなし)を満たす
  2. FR-3 fixture 完走(opencode / cursor の install→verify、`--harness foo` は exit 2+6値列挙)
  3. FR-2 落ちる実証(列挙欠落注入→契約テスト赤)を実測記録
  4. FR-4 `npm pack --dry-run` green+将来条件チェックリスト成果物収載
  5. FR-5 README 3箇所同期、FR-6 advisory 2面(KNOWN_HARNESS_DIRS / otherTrees)+計8ミラー regen
  6. 全検証コマンド exit 0(typecheck / lint / dist:check / promote:self:check / --ci / coverage+patch gate)、push 前ローカル lcov で diff 追加行未カバー 0
  7. deslop 実行後に全検証再実行、PR(`Fixes #1048`)+実装者以外レビュアー指名
- **確信仮説**: 「installer の閉じ列挙は 8サイト+テスト2本の台帳更新だけで新ハーネスへ拡張でき、汎用機構(wizard/verifier/plan/payload)は無改修で自動追随する」— Bolt 出荷でこの台帳の完全性が実証される
- **期待デモ**: fixture 環境で `amadeus-setup install --harness opencode --yes` → exit 0・`.opencode/`+`amadeus/`+`AGENTS.md` 配置・verify 通過(cursor 同様)。`--harness foo` → exit 2+6値列挙

## 後続 Bolt

なし。Bolt 1 完了 = intent の Construction 完了(ラダープロンプトは Bolt 1本のため実質不発)。
