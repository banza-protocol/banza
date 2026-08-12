# A NEW Python crypto engine — must be blocked by ADR-037.
import nacl.signing
def verify_signature(msg, sig, pk):  # ed25519
    return nacl.signing.VerifyKey(pk).verify(msg, sig)
