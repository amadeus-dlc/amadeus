# User Stories Assessment（260705-engine-installer）

上流入力: [stories.md](stories.md)

## 評価

- **網羅性**: US-1〜US-9 は Issue #451 の受け入れ条件 4 点（US-1/US-6 = 条件 1・4、US-8 = 条件 2、US-2 = 条件 3）と grilling 確定 6 件（D1 = US-1、D2 = US-7、D3 = US-1/US-4、D4 = US-1、D5 = US-2/US-3、D6 = US-1（スモーク層）/US-6（README 層）/US-8（eval 層））をすべてカバーする。FR-1.1 の事前チェック失敗パスは US-5 が、AMADEUS.md 変換の双方向検査は US-9 が担う。
- **テスト可能性**: 各ストーリーの受け入れ条件は FR-2 系 eval（US-2/3/4/5/7/8/9）または手動確認可能な出力（US-1/6）に対応付いている。US-1 の「5 工程」は wireframes.md の CLI 設計を出典とする。
- **MoSCoW**: Must 7 / Should 2（US-7 Codex 検証、US-9 AMADEUS.md 品質）/ Won't 2（Windows、bunx = ストーリー外）。MVP 境界の正式決定は delivery-planning が行い、本ラベルはその判断材料である。

## 検証の空白（申し送り）

- FR-1.8 の no-rollback 挙動（中断時点までの適用済み工程の残存）そのものを直接検証する eval はない。FR-2.9 が「残存は仕様どおり」と扱うため矛盾はないが、検証の空白として functional-design（eval 設計）へ申し送る。
- US-3 の「amadeus* 以外の skills 無傷」に対応する eval 項目は requirements.md へ FR-2.11 として追補した（本ステージ発、gate 承認で確定）。

## 優先順位

US-1（導入の成立）> US-8（継続検証）> US-2/US-3（冪等・非破壊）> US-4/US-5（エラー時の安全）> US-9（AMADEUS.md 品質）> US-6（README）> US-7（Codex 検証）。
実装順は TDD の都合で eval（US-8 の骨格）が先行する（NFR-1）。
