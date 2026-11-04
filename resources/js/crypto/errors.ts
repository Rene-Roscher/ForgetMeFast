export type CryptoErrorCode =
    | 'InsecureContext'
    | 'InvalidLink'
    | 'InvalidPayload'
    | 'UnsupportedVersion'
    | 'KdfParamsOutOfBounds'
    | 'KdfFailed'
    | 'InvalidPassword'
    | 'EmptySecret'
    | 'SecretTooLarge'
    | 'DecryptFailed';

/** Fehler des Krypto-Moduls. Die Meldung ist absichtlich nur der Code: nie Schlüsselmaterial in Fehlertexten. */
export class CryptoError extends Error {
    readonly code: CryptoErrorCode;

    constructor(code: CryptoErrorCode) {
        super(code);
        this.name = 'CryptoError';
        this.code = code;
    }
}
