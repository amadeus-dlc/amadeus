# D002: single intent for gate contract

## 背景

Issue #306（skill 側のゲート契約）と #307（validator 側の evidence 検査）は、親 Issue #314 で「同じゲート契約の両面」と整理されており、Discovery で統合可否を判断する必要があった。

## 判断

Issue #306 と #307 を 1 つの Intent `20260702-phase-gate-approval-contract` に統合して扱う。

## 理由

契約定義（skill）と検査（validator）を別 Intent に分けると、契約形式の合意を 2 回やり直すリスクがある。
cycle 往復コストの削減という親 Issue #314 の目的とも整合する。
段階実装が必要な場合は、Intent 内の Unit と Bolt の分割で扱える。

## 影響

Inception では、skill 契約の Unit と validator 検査の Unit を分けて設計できるよう、要求を両面で分解する。

この判断は、Discovery [20260702-phase-cycle-deterministic-contract](../../../../discoveries/20260702-phase-cycle-deterministic-contract.md) の Grilling Decision Trail GD002 で確定した内容の記録である。
