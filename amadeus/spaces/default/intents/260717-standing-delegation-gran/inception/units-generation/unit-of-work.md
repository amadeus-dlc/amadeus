# Unit of Work — standing-delegation-grant(Issue #1125)

上流入力(consumes 全数): `../application-design/components.md`(C-1〜C-6)、`../application-design/component-methods.md`、`../application-design/services.md`(三経路の権限フロー)、`../application-design/component-dependency.md`(直列 C-5→C-1→C-2→C-4→C-6)、`../application-design/decisions.md`(ADR-1〜7)、`../requirements-analysis/requirements.md`(FR-1〜8)

## Unit 分割判定

**単一 Unit**(`standing-grant`)。根拠: C-1〜C-6 は全て同一の provenance 第3経路の面(verb/検証/分類/doctor/taxonomy/テスト)で変更理由が完全に凝集(SD SQ2 裁定の units-generation 確定)。分割は中間契約の管理コストだけを生む。

## Unit: standing-grant

- スコープ: C-5(taxonomy/保護イベント)+C-1(grant/revoke verb)+C-2(受理検証・C-3 内包)+C-4(doctor)+C-6(テスト)+docs 明文(e2 留保)+dist/self-install 再生成
- 受け入れ基準: FR-1〜7 の全 AC(FR-8 は着地後運用)。AC-3a は E-SDG-AD2 裁定 X(approve 側のみ)の遡及訂正済み文言を正とする
- 検証: AC-5d の全コマンド列+落ちる実証 赤側6種(AC-5a)+白側 sweep(AC-5c)+一時状態 fixture(AC-5b)+local lcov patch 未カバー 0
- 規模: 新規テスト 〜260行+verb/検証 〜260行+doctor/taxonomy 〜50行+docs+dist 伝播(単一 Bolt)
- Bolt 対応: Bolt 1 = standing-grant(1:1)

## 分割しない判断の根拠

実装順序は component-dependency.md の直列(C-5→C-1→C-2→C-4→C-6)で、全変更が同一検証列に閉じる。単一 PR 規模(#922 Bolt 1 と同級)で Bolt 単位 PR 原則と両立。
