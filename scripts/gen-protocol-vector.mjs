// Erzeugt den Protokoll-Testvektor für Protokoll v1 (docs/CRYPTO-NOTES.md).
// Benutzt ausschließlich node:crypto (OpenSSL) und kein Modul aus resources/js/crypto/, damit der Vektor
// eine vom Modul unabhängige Quelle ist. Aufruf: node scripts/gen-protocol-vector.mjs > resources/js/crypto/vectors/protocol-v1.json
import { argon2Sync, createCipheriv, createHash, hkdfSync } from 'node:crypto';

const seq = (start, n) => Buffer.from(Array.from({ length: n }, (_, i) => start + i));
const b64u = (b) => Buffer.from(b).toString('base64url');
const sha256 = (b) => createHash('sha256').update(b).digest();

const BUCKETS = [1024, 4096, 16384, 65536];

function build({ name, password, secret }) {
    const id = seq(0x10, 16);
    const kLink = seq(0x20, 32);
    const salt = seq(0x40, 16);
    const iv = seq(0x50, 12);
    const manageToken = seq(0x60, 32);
    const kdf = { name: 'argon2id', m: 19456, t: 2, p: 1 };

    // Header = AAD: "FMF" | v | id | kdf_id | m(u32be) | t(u32be) | p(u32be) | salt   (49 Byte)
    const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
    const header = Buffer.concat([Buffer.from('FMF'), Buffer.from([1]), id, Buffer.from([1]), u32(kdf.m), u32(kdf.t), u32(kdf.p), salt]);

    const pwBytes = Buffer.from(password.normalize('NFKC'), 'utf8');
    const pwKey = argon2Sync('argon2id', { message: pwBytes, nonce: salt, memory: kdf.m, passes: kdf.t, parallelism: kdf.p, tagLength: 32 });
    const ikm = Buffer.concat([kLink, pwKey]);
    const kEnc = Buffer.from(hkdfSync('sha256', ikm, salt, 'fmf/v1/enc', 32));
    const kAuth = Buffer.from(hkdfSync('sha256', ikm, salt, 'fmf/v1/auth', 32));

    const plain = Buffer.from(secret, 'utf8');
    const bucket = BUCKETS.find((b) => b >= plain.length + 4);
    const padded = Buffer.alloc(bucket);
    padded.writeUInt32BE(plain.length, 0);
    plain.copy(padded, 4);

    const cipher = createCipheriv('aes-256-gcm', kEnc, iv);
    cipher.setAAD(header);
    const ct = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);

    return {
        name,
        inputs: {
            password,
            secret,
            id_hex: id.toString('hex'),
            k_link_hex: kLink.toString('hex'),
            salt_hex: salt.toString('hex'),
            iv_hex: iv.toString('hex'),
            manage_token_hex: manageToken.toString('hex'),
            kdf,
        },
        outputs: {
            header_hex: header.toString('hex'),
            pw_key_hex: pwKey.toString('hex'),
            k_enc_hex: kEnc.toString('hex'),
            k_auth_hex: kAuth.toString('hex'),
            verifier: b64u(sha256(kAuth)),
            manage_hash: b64u(sha256(manageToken)),
            bucket,
            padded_sha256_hex: sha256(padded).toString('hex'),
            ciphertext: b64u(ct),
            link_fragment: b64u(kLink),
        },
    };
}

const vectors = [
    build({ name: 'ascii-password', password: 'correct horse battery staple', secret: 'Hallo Wörld 🔐 geheim' }),
    // NFKC: volle Breite und Ligatur werden zu ASCII normalisiert, das Ergebnis muss dem ASCII-Passwort entsprechen.
    build({ name: 'nfkc-password', password: 'ｐａｓｓｗｏｒｄ１２３４ ﬁsh', secret: 'x' }),
];
process.stdout.write(JSON.stringify({ generator: 'scripts/gen-protocol-vector.mjs', node: process.version, vectors }, null, 2) + '\n');
