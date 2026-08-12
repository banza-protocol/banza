//! The fictional KZ_DEMO ledger.
//!
//! Everything here is imaginary money. The point is not the money — it is that the arithmetic obeys
//! the protocol's invariants, so the simulator can demonstrate them rather than assert them.
//!
//! Amounts are `i64` MINOR UNITS. No floating point anywhere: the protocol forbids it for real
//! money (INV-LEDGER-*), and a simulator that used floats to demonstrate integer arithmetic would be
//! demonstrating the wrong thing.

use serde_json::{json, Value};
use std::collections::BTreeMap;

/// The only currency this simulator will accept. Anything else is a boundary violation, not a
/// feature request.
pub const DEMO_CURRENCY: &str = "KZ_DEMO";

/// Currency codes that must never appear: a simulator that quotes a real currency looks like it
/// moves real money, whatever the surrounding labels say.
pub const FORBIDDEN_CURRENCIES: &[&str] = &[
    "AOA", "USD", "EUR", "GBP", "BRL", "ZAR", "CNY", "JPY", "CHF", "NGN", "KES", "MZN", "CVE",
];

#[derive(Debug, Clone, PartialEq)]
pub struct Account {
    pub id: String,
    pub display_name: String,
    pub balance: i64,
    /// A settlement account may legitimately hold fee income; a user or merchant account may not be
    /// credited out of nowhere.
    pub is_settlement: bool,
}

#[derive(Debug, Clone)]
pub struct Ledger {
    accounts: BTreeMap<String, Account>,
    /// Every movement, in order. The reconciliation walks this, it does not trust running totals.
    entries: Vec<Entry>,
}

#[derive(Debug, Clone)]
pub struct Entry {
    pub transaction_id: String,
    pub from_account: String,
    pub to_account: String,
    pub amount: i64,
    pub kind: &'static str,
    pub reference: String,
}

/// Why a simulated operation could not proceed. Maps 1:1 onto `vocab::SIMULATION_ERROR_CODE`.
#[derive(Debug, Clone, PartialEq)]
pub struct SimError {
    pub code: &'static str,
    pub detail: String,
}

impl SimError {
    fn new(code: &'static str, detail: impl Into<String>) -> Self {
        SimError {
            code,
            detail: detail.into(),
        }
    }
    pub fn to_json(&self) -> Value {
        json!({ "code": self.code, "detail": self.detail, "label": crate::vocab::label(self.code) })
    }
}

impl Ledger {
    /// The canonical opening position: a fictional user, a fictional merchant, and the simulator's
    /// own settlement account.
    pub fn demo() -> Self {
        let mut accounts = BTreeMap::new();
        for (id, name, bal, settle) in [
            (
                "demo-user-ana",
                "Ana (utilizador fictício)",
                100_000_i64,
                false,
            ),
            (
                "demo-merchant-kiosque",
                "Kiosque (comerciante fictício)",
                0,
                false,
            ),
            (
                "operator-zero",
                "Operador Zero (liquidação fictícia)",
                0,
                true,
            ),
        ] {
            accounts.insert(
                id.to_string(),
                Account {
                    id: id.to_string(),
                    display_name: name.to_string(),
                    balance: bal,
                    is_settlement: settle,
                },
            );
        }
        Ledger {
            accounts,
            entries: Vec::new(),
        }
    }

    pub fn balance(&self, id: &str) -> Option<i64> {
        self.accounts.get(id).map(|a| a.balance)
    }

    pub fn entries(&self) -> &[Entry] {
        &self.entries
    }

    /// The total fictional value in the system. Conservation of this number across every operation
    /// is the invariant the whole simulator exists to demonstrate: a payment moves value, it never
    /// creates or destroys it, and a fee is a movement to the settlement account rather than a leak.
    pub fn total(&self) -> i64 {
        self.accounts.values().map(|a| a.balance).sum()
    }

    /// Move fictional value. Double-entry by construction: one debit, one credit, same amount, in a
    /// single operation that either applies fully or not at all.
    pub fn transfer(
        &mut self,
        transaction_id: &str,
        from: &str,
        to: &str,
        amount: i64,
        kind: &'static str,
        reference: &str,
    ) -> Result<(), SimError> {
        if amount <= 0 {
            return Err(SimError::new(
                "amount_not_positive",
                format!("montante {amount} não é positivo"),
            ));
        }
        if !self.accounts.contains_key(from) {
            return Err(SimError::new("unknown_account", format!("conta {from}")));
        }
        if !self.accounts.contains_key(to) {
            return Err(SimError::new("unknown_account", format!("conta {to}")));
        }
        let available = self.accounts[from].balance;
        if available < amount {
            return Err(SimError::new(
                "insufficient_balance",
                format!("{from} tem {available}, precisa de {amount}"),
            ));
        }

        // Apply both sides together. A partial application is exactly the failure INV-LEDGER
        // atomicity forbids, so it must be impossible to express here.
        self.accounts.get_mut(from).unwrap().balance -= amount;
        self.accounts.get_mut(to).unwrap().balance += amount;
        self.entries.push(Entry {
            transaction_id: transaction_id.to_string(),
            from_account: from.to_string(),
            to_account: to.to_string(),
            amount,
            kind,
            reference: reference.to_string(),
        });
        Ok(())
    }

    /// Walk every entry from the opening position and check the closing balances match. This
    /// deliberately re-derives rather than trusting `self.accounts`: a reconciliation that reads the
    /// same numbers it is checking proves nothing.
    pub fn reconcile(&self, opening: &Ledger) -> Value {
        let mut derived: BTreeMap<String, i64> = opening
            .accounts
            .iter()
            .map(|(k, a)| (k.clone(), a.balance))
            .collect();

        for e in &self.entries {
            *derived.entry(e.from_account.clone()).or_insert(0) -= e.amount;
            *derived.entry(e.to_account.clone()).or_insert(0) += e.amount;
        }

        let mut discrepancies = Vec::new();
        for (id, actual) in self.accounts.iter().map(|(k, a)| (k, a.balance)) {
            let expected = derived.get(id).copied().unwrap_or(0);
            if expected != actual {
                discrepancies.push(json!({
                    "account": id, "expected": expected, "actual": actual,
                }));
            }
        }

        let conserved = self.total() == opening.total();
        if !conserved {
            discrepancies.push(json!({
                "account": "*", "expected": opening.total(), "actual": self.total(),
                "detail": "o valor fictício total não foi conservado",
            }));
        }

        let status = if discrepancies.is_empty() {
            "reconciled"
        } else {
            "discrepancy"
        };
        json!({
            "status": status,
            "status_label": crate::vocab::label(status),
            "ledger_status": if conserved { "balanced" } else { "unbalanced" },
            "opening_total": opening.total(),
            "closing_total": self.total(),
            "movements": self.entries.len(),
            "discrepancies": discrepancies,
            "currency": DEMO_CURRENCY,
            "demo_only": true,
            "monetary_value": false,
        })
    }

    pub fn to_json(&self) -> Value {
        json!({
            "operator_id": "operator-zero",
            "operator_display_name": "Operador Zero",
            "demo_only": true,
            "monetary_value": false,
            "production_allowed": false,
            "currency": DEMO_CURRENCY,
            "accounts": self.accounts.values().map(|a| json!({
                "account_id": a.id,
                "display_name": a.display_name,
                "balance": a.balance,
                "currency": DEMO_CURRENCY,
                "is_settlement": a.is_settlement,
            })).collect::<Vec<_>>(),
            "total": self.total(),
            "ledger_status": if self.entries.is_empty() { "empty" } else { "balanced" },
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_opening_position_is_the_documented_one() {
        let l = Ledger::demo();
        assert_eq!(l.balance("demo-user-ana"), Some(100_000));
        assert_eq!(l.balance("demo-merchant-kiosque"), Some(0));
        assert_eq!(l.balance("operator-zero"), Some(0));
        assert_eq!(l.total(), 100_000);
    }

    #[test]
    fn a_transfer_conserves_the_total() {
        let opening = Ledger::demo();
        let mut l = opening.clone();
        l.transfer(
            "txn_1",
            "demo-user-ana",
            "demo-merchant-kiosque",
            1_500,
            "payment",
            "qr_1",
        )
        .unwrap();
        assert_eq!(l.balance("demo-user-ana"), Some(98_500));
        assert_eq!(l.balance("demo-merchant-kiosque"), Some(1_500));
        assert_eq!(l.total(), opening.total(), "value was created or destroyed");
        assert_eq!(l.reconcile(&opening)["status"], "reconciled");
    }

    #[test]
    fn a_refund_returns_value_and_still_reconciles() {
        let opening = Ledger::demo();
        let mut l = opening.clone();
        l.transfer(
            "txn_1",
            "demo-user-ana",
            "demo-merchant-kiosque",
            1_500,
            "payment",
            "qr_1",
        )
        .unwrap();
        l.transfer(
            "txn_2",
            "demo-merchant-kiosque",
            "demo-user-ana",
            500,
            "refund",
            "txn_1",
        )
        .unwrap();
        assert_eq!(l.balance("demo-user-ana"), Some(99_000));
        assert_eq!(l.balance("demo-merchant-kiosque"), Some(1_000));
        assert_eq!(l.total(), opening.total());
        assert_eq!(l.reconcile(&opening)["status"], "reconciled");
        assert_eq!(l.reconcile(&opening)["movements"], 2);
    }

    #[test]
    fn a_fee_moves_to_settlement_rather_than_leaking() {
        let opening = Ledger::demo();
        let mut l = opening.clone();
        l.transfer(
            "txn_1",
            "demo-user-ana",
            "demo-merchant-kiosque",
            1_500,
            "payment",
            "qr_1",
        )
        .unwrap();
        l.transfer(
            "txn_1_fee",
            "demo-merchant-kiosque",
            "operator-zero",
            50,
            "fee",
            "txn_1",
        )
        .unwrap();
        assert_eq!(l.balance("operator-zero"), Some(50));
        assert_eq!(
            l.total(),
            opening.total(),
            "a fee must not change the total"
        );
        assert_eq!(l.reconcile(&opening)["status"], "reconciled");
    }

    #[test]
    fn an_overdraw_is_refused_and_changes_nothing() {
        let mut l = Ledger::demo();
        let before = l.clone();
        let err = l
            .transfer(
                "txn_x",
                "demo-merchant-kiosque",
                "demo-user-ana",
                1,
                "payment",
                "r",
            )
            .unwrap_err();
        assert_eq!(err.code, "insufficient_balance");
        assert_eq!(
            l.balance("demo-merchant-kiosque"),
            before.balance("demo-merchant-kiosque")
        );
        assert_eq!(
            l.entries().len(),
            0,
            "a refused transfer must leave no entry"
        );
    }

    #[test]
    fn a_non_positive_amount_is_refused() {
        let mut l = Ledger::demo();
        for amount in [0_i64, -1, -1_000] {
            let e = l
                .transfer(
                    "t",
                    "demo-user-ana",
                    "demo-merchant-kiosque",
                    amount,
                    "payment",
                    "r",
                )
                .unwrap_err();
            assert_eq!(
                e.code, "amount_not_positive",
                "amount {amount} was accepted"
            );
        }
        assert_eq!(l.total(), 100_000);
    }

    #[test]
    fn an_unknown_account_is_refused_in_either_direction() {
        let mut l = Ledger::demo();
        assert_eq!(
            l.transfer("t", "nobody", "demo-user-ana", 1, "payment", "r")
                .unwrap_err()
                .code,
            "unknown_account"
        );
        assert_eq!(
            l.transfer("t", "demo-user-ana", "nobody", 1, "payment", "r")
                .unwrap_err()
                .code,
            "unknown_account"
        );
    }

    // The reconciliation must be able to FAIL, or it proves nothing when it passes.
    #[test]
    fn reconciliation_detects_a_tampered_balance() {
        let opening = Ledger::demo();
        let mut l = opening.clone();
        l.transfer(
            "txn_1",
            "demo-user-ana",
            "demo-merchant-kiosque",
            1_500,
            "payment",
            "qr_1",
        )
        .unwrap();
        // Simulate corruption: a balance that no entry accounts for.
        l.accounts.get_mut("demo-merchant-kiosque").unwrap().balance += 999;
        let r = l.reconcile(&opening);
        assert_eq!(r["status"], "discrepancy");
        assert_eq!(r["ledger_status"], "unbalanced");
        assert!(!r["discrepancies"].as_array().unwrap().is_empty());
    }
}
