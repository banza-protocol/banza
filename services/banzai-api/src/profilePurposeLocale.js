// Reader-facing prose for each conformance profile, per locale.
//
// The canonical registry (contracts/production/conformance-profiles.production.json) owns WHICH profiles
// exist, their identifiers and their normative properties. Its `purpose` field is canonical English
// source prose — a normative artifact written for implementers, not a sentence composed for a reader in
// a chosen language.
//
// It was being interpolated raw into the Portuguese answer, which is how "o que é L0?" came back as
// "O L0 é o perfil Protocol Sandbox. Prove the protocol can be instantiated in a controlled test
// environment…" — an English imperative wedged inside a Portuguese sentence. Translating the registry to
// fix a chat answer would have been the wrong repair: the normative source stays as it is, and the
// PRESENTATION layer owns the reader's language. That is what this file is.
//
// Keyed by the profile LEVEL, which is the registry's stable identity. This file never says which
// profiles exist — enumerate the registry for that. If a level appears there without an entry here, the
// coverage property fails loudly rather than letting English leak into Portuguese as a fallback.

/** @typedef {"pt-PT"|"en"} Locale */

/**
 * Reader prose per level per locale.
 *
 * The English text is a faithful realization of the registry's `purpose`, deliberately written here
 * rather than referenced from the registry: both locales must travel the same path, or English silently
 * becomes "the raw field" again and only Portuguese is really localized.
 */
export const PROFILE_PURPOSE = Object.freeze({
  L0: {
    "pt-PT":
      "Demonstra que o protocolo pode ser instanciado num ambiente de teste controlado e que a representação monetária fundamental está correcta.",
    en: "It shows the protocol can be instantiated in a controlled test environment and that the core monetary representation is correct.",
  },
  L1: {
    "pt-PT":
      "Cobre a capacidade de pagamento do consumidor, a aceitação pelo comerciante, a transferência e a rastreabilidade.",
    en: "It covers consumer payment, merchant acceptance, transfer and traceability capability.",
  },
  L2: {
    "pt-PT":
      "Cobre o pedido de pagamento, a iniciação de pagamento e a execução instantânea.",
    en: "It covers payment request, payment initiation and instant execution capability.",
  },
  L3: {
    "pt-PT":
      "Cobre o encaminhamento entre operadores, a liquidação inter-operador e a reconciliação automatizada. É o limiar de elegibilidade para federação.",
    en: "It covers cross-operator routing, inter-operator settlement and automated reconciliation. This is the federation eligibility threshold.",
  },
  L4: {
    "pt-PT":
      "Cobre a integração com redes de pagamento externas e com infra-estrutura de acquiring.",
    en: "It covers integration with external payment networks and acquiring infrastructure.",
  },
});

/**
 * The reader prose for a level in a locale, or null when this file does not cover it.
 *
 * Returning null rather than any other locale's text is the whole point: a missing realization must be
 * visible to the caller, never papered over with the wrong language.
 */
export function profilePurpose(level, locale) {
  const row = PROFILE_PURPOSE[String(level || "").toUpperCase()];
  return (row && row[locale]) || null;
}

/** Levels this file provides prose for. The registry, not this list, decides which levels must exist. */
export function coveredLevels() {
  return Object.keys(PROFILE_PURPOSE);
}
