# Security Requirements — u001-engine-installer（260705-engine-installer）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[constraint-register.md](../../../ideation/feasibility/constraint-register.md)

## 要求

| ID | 要求 | 根拠 |
|---|---|---|
| SEC-1 | 認証情報・シークレットを扱わない。配布物にもインストーラにも credential を含めない | Construction ガードレール（Security）。配布物は静的ファイルのみ |
| SEC-2 | `--target` の入力は path として解決し、書き込み先はすべて `<target>` 配下に閉じる | FR-1.2〜FR-1.6（各コピー・マージ操作の書き込み先が `<target>` 配下に限定される設計） |
| SEC-3 | 利用者の既存資産（非対象 skills、settings.json の非対象キー、aidlc/）を変更しない | FR-1.3 / FR-1.6 / FR-1.9、BR-10 |
| SEC-4 | インストーラは外部ネットワークへ接続しない | NFR-2、オフライン前提 |

## 適用判断

認証・認可・暗号化は不適用とする（ローカル CLI、ネットワーク境界なし）。

## 検証の対応

- SEC-2: 書き込み境界は設計（FR-1.2〜1.6 の実装レビュー）で担保する。相対パス・symlink を介した `--target` の脱出に対する動的検証は置かない: 単発ローカル CLI で、利用者自身が自分の権限で自分の指定先へ書く道具であり、攻撃者と被害者が分離しないため脅威モデル上許容する（本判断をもって記録とする）。
- SEC-3: settings.json の非対象キー = FR-2.7（deep-equal）、非対象 skills = FR-2.11（バイト単位）、`aidlc/` 不可侵 = FR-2.13（本ステージ発の追補、gate 承認で確定。FR-2.12 と同じく B002（hardening）に割り当てる）で個別に検証する。
- SEC-1 / SEC-4: 配布物とインストーラの実装レビュー（PR）で担保する（動的検証は不要）。
