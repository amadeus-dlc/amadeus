# Deployment Architecture — u001-installer-versioning（260706-installer-versioning）

上流入力: [reliability-design.md](../nfr-design/reliability-design.md)、[business-logic-model.md](../functional-design/business-logic-model.md)、application-design の [services.md](../../../inception/application-design/services.md)

## 配置

本機能の「配置」は #451 と同一で変更しない: 配布 = git clone された本リポジトリ、実行 = `bun run scripts/amadeus-install.ts --target <workspace>`（ローカル、オフライン可）。サーバ・クラウド資源は使わない。

本 Intent で増える配置物は導入先の 2 点のみ: `<target>/.amadeus-install.json`（manifest）と、退避発生時の `<target>/.amadeus-install-backup/<時刻>/`。いずれも target 直下（amadeus/ 不可侵 = C-4）。
