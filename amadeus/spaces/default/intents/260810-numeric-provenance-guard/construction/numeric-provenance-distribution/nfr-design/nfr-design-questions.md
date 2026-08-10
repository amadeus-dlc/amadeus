# NFR Design Questions — numeric-provenance-distribution

本UnitではNFR Requirements成果物がscopeによりabsent-and-expectedであり、宣言済みSEC-* IDはない。U3はruntimeロジックを持たず、core sourceから生成配送面へのintegrityだけを設計する。

## Q1. Authority boundary

core sourceだけをauthorityとするか、生成されたdist/self-install surfaceも編集可能なauthorityとするか。

[Answer]: E-NFRDU3-1 `core-only-authority`。`packages/framework/core/` だけを編集し、distとself-install surfaceはbuildのdisposable projectionとする。生成面の手編集・commit・逆同期を許さない。自動裁定: `auto-decision-2016c88891dd06c03a3a5616392bc686`。

## Q2. Delivery integrity

配送integrityをsource存在だけで確認するか、再現可能buildとdelivery-tree fireの両方で閉じるか。

[Answer]: E-NFRDU3-2 `reproducible-build-plus-delivery-fire`。同一sourceから2回のisolated buildをbyte比較し、自己インストール配送先のmanifest/tool経由で正負fixtureをfireしてaudit終端まで確認する。自動裁定: `auto-decision-e6f031fdbd6eeeea4810cba982765b1f`。

## 対話方式

[Answer]: E-NFRDU3-0 `guide`。authority boundary、delivery integrityの順に裁定した。自動裁定: `auto-decision-833d6d5bdb42472fd504675cbab3b82d`。

## 曖昧性分析

- NFR Requirements欠落は正常であり、新しいsecurity requirement IDやcloud controlを作らない。
- 配送先treeは受け入れ確認面であり、変更の正本ではない。
- reproducibilityは同じsource/lockfile/toolchain条件のisolated build間で判定し、既存worktreeのdirty generated outputを基準にしない。
- network registryへのpublish、AWS resource、credential、artifact signing serviceはscope外である。
