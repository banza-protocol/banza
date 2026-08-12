//! banza-simb (ADR-037, R8) — a local, deterministic, in-process simulator of a BANZA operator and
//! federation peer. It exists so the Rust conformance runner can execute live-operator and federation
//! conformance **without a running operator, without a network, without funds, and without secrets**.
//!
//! TEST ONLY. No real funds move; no Postgres; no external call; no operator is added to `/operators`;
//! no production certificate is emitted. Every simulator carries `test_only = true`.

use serde::Serialize;
use std::collections::HashMap;

pub mod scenario;

#[cfg(feature = "wasm")]
mod wasm;

pub const SIMB_MARKER: &str = "TEST ONLY — LOCAL SIMULATOR, NOT PRODUCTION";

#[derive(Serialize, Clone, Debug)]
pub struct LedgerEntry {
    pub wallet_id: String,
    pub kind: String, // "DEBIT" | "CREDIT"
    pub amount_minor: i64,
    pub currency: String,
    pub trace_id: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct Settlement {
    pub id: String,
    pub wallet_id: String,
    pub gross_minor: i64,
    pub fee_minor: i64,
    pub net_minor: i64,
    pub currency: String,
    pub tx_count: usize,
}

#[derive(Serialize, Clone, Debug)]
pub struct TransferResult {
    pub ok: bool,
    pub transfer_id: String,
    pub new_entries: Vec<LedgerEntry>,
    pub idempotent_replay: bool,
    pub error: Option<String>,
}

/// A simulated operator with an in-memory ledger. Deterministic; seed wallets exist on construction.
pub struct SimOperator {
    pub id: String,
    fee_bps: i64, // fee in basis points, applied at settlement
    /// The currency stamped on every ledger entry and settlement this operator produces. Defaults to
    /// "AOA" (the historical value for every existing caller); the demo tree overrides it to KZ_DEMO.
    currency: String,
    balances: HashMap<String, i64>,
    ledger: Vec<LedgerEntry>,
    settlements: Vec<Settlement>,
    idempotency: HashMap<String, String>, // key -> transfer_id
    trace_seq: u64,
}

impl SimOperator {
    /// Construct with the canonical sandbox seed wallets (consumer + merchant), deterministic balances.
    /// Currency is "AOA" — backward-compatible with every existing caller and test.
    pub fn new(id: &str) -> Self {
        Self::new_with_currency(id, "AOA")
    }

    /// Same as [`SimOperator::new`], but stamps `currency` on every ledger entry and settlement. Used by
    /// the Operador Zero demo run so it produces KZ_DEMO artifacts (never real currency); behaviour is
    /// otherwise identical.
    pub fn new_with_currency(id: &str, currency: &str) -> Self {
        let mut balances = HashMap::new();
        balances.insert("sandbox-consumer-1".to_string(), 1_000_000);
        balances.insert("sandbox-merchant-1".to_string(), 0);
        balances.insert("sandbox-merchant-2".to_string(), 0);
        SimOperator {
            id: id.into(),
            fee_bps: 100, // 1%
            currency: currency.into(),
            balances,
            ledger: Vec::new(),
            settlements: Vec::new(),
            idempotency: HashMap::new(),
            trace_seq: 0,
        }
    }

    pub fn health(&self) -> bool {
        true
    }

    pub fn balance(&self, wallet: &str) -> Option<i64> {
        self.balances.get(wallet).copied()
    }

    pub fn ledger_for(&self, wallet: &str) -> Vec<&LedgerEntry> {
        self.ledger
            .iter()
            .filter(|e| e.wallet_id == wallet)
            .collect()
    }

    /// Create a transfer: exactly one DEBIT + one CREDIT (double-entry), idempotent by key.
    pub fn create_transfer(
        &mut self,
        from: &str,
        to: &str,
        amount: i64,
        idem_key: &str,
    ) -> TransferResult {
        if amount <= 0 {
            return TransferResult {
                ok: false,
                transfer_id: String::new(),
                new_entries: vec![],
                idempotent_replay: false,
                error: Some("amount_minor must be a positive integer".into()),
            };
        }
        if let Some(existing) = self.idempotency.get(idem_key) {
            // replay: same key returns the same result, no new entries (INV-IDEM)
            return TransferResult {
                ok: true,
                transfer_id: existing.clone(),
                new_entries: vec![],
                idempotent_replay: true,
                error: None,
            };
        }
        let from_bal = self.balances.get(from).copied().unwrap_or(0);
        if from_bal < amount {
            return TransferResult {
                ok: false,
                transfer_id: String::new(),
                new_entries: vec![],
                idempotent_replay: false,
                error: Some("insufficient balance (no negative balance)".into()),
            };
        }
        self.trace_seq += 1;
        let trace = format!("trace-{}-{}", self.id, self.trace_seq);
        let tid = format!("transfer-{}-{}", self.id, self.trace_seq);
        *self.balances.get_mut(from).unwrap() -= amount;
        *self.balances.entry(to.to_string()).or_insert(0) += amount;
        let debit = LedgerEntry {
            wallet_id: from.into(),
            kind: "DEBIT".into(),
            amount_minor: amount,
            currency: self.currency.clone(),
            trace_id: trace.clone(),
        };
        let credit = LedgerEntry {
            wallet_id: to.into(),
            kind: "CREDIT".into(),
            amount_minor: amount,
            currency: self.currency.clone(),
            trace_id: trace,
        };
        self.ledger.push(debit.clone());
        self.ledger.push(credit.clone());
        self.idempotency.insert(idem_key.into(), tid.clone());
        TransferResult {
            ok: true,
            transfer_id: tid,
            new_entries: vec![debit, credit],
            idempotent_replay: false,
            error: None,
        }
    }

    /// Create a settlement batch for a wallet: net + fee == gross (INV-SETTLE identity).
    pub fn create_settlement(&mut self, wallet: &str) -> Settlement {
        let credits: Vec<&LedgerEntry> = self
            .ledger
            .iter()
            .filter(|e| e.wallet_id == wallet && e.kind == "CREDIT")
            .collect();
        let gross: i64 = credits.iter().map(|e| e.amount_minor).sum();
        let fee = gross * self.fee_bps / 10_000;
        let net = gross - fee;
        let s = Settlement {
            id: format!("settle-{}-{}", self.id, self.settlements.len() + 1),
            wallet_id: wallet.into(),
            gross_minor: gross,
            fee_minor: fee,
            net_minor: net,
            currency: self.currency.clone(),
            tx_count: credits.len(),
        };
        self.settlements.push(s.clone());
        s
    }

    pub fn manifest(&self) -> serde_json::Value {
        serde_json::json!({
            "operator_id": self.id, "environment": "sandbox", "simulated": true,
            "production_allowed": false, "certification_level": 1, "test_only": true
        })
    }
}

/// A federation of two simulated operators sharing a signed peer certificate + BRL context.
pub struct Federation {
    pub a: SimOperator,
    pub b: SimOperator,
    pub obligations: Vec<(String, String, i64)>, // (from_op, to_op, amount)
}

impl Federation {
    pub fn new() -> Self {
        Federation {
            a: SimOperator::new("SIM-A"),
            b: SimOperator::new("SIM-B"),
            obligations: vec![],
        }
    }

    /// Route a federated payment A→B: atomic debit on A + an irrevocable obligation. Idempotent.
    pub fn route(&mut self, amount: i64, idem_key: &str) -> TransferResult {
        // debit A's consumer to A's "federation-out" holding
        let r = self
            .a
            .create_transfer("sandbox-consumer-1", "federation-out", amount, idem_key);
        if r.ok && !r.idempotent_replay {
            self.obligations
                .push((self.a.id.clone(), self.b.id.clone(), amount));
        }
        r
    }

    /// Net the bilateral obligations A↔B → a single net position (INV-RECON/settlement).
    pub fn net_position(&self) -> i64 {
        self.obligations.iter().map(|(_, _, amt)| *amt).sum()
    }
}

impl Default for Federation {
    fn default() -> Self {
        Self::new()
    }
}
