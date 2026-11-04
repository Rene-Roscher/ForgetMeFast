// Platzhalter für das Secret-Feld: zehn erfundene Beispiele, damit klar wird, was man hier hineinlegen kann. Alles ist
// offensichtlich unecht (Testwerte und "EXAMPLE"), nichts davon ist ein gültiger Schlüssel. Die Kartennummer ist die
// öffentliche Stripe-Testkarte (https://docs.stripe.com/testing).
export const EXAMPLES: readonly string[] = [
    'DB_HOST=db.example.test\nDB_USER=app\nDB_PASSWORD=EXAMPLE-not-a-real-password',
    'STRIPE_SECRET_KEY=sk_test_EXAMPLEEXAMPLEEXAMPLE00',
    'Webhook-Signing-Secret:\nwhsec_EXAMPLEEXAMPLEEXAMPLEEXAMPLE00',
    'Karte: 4242 4242 4242 4242\nGültig bis 12/34, Prüfziffer 123',
    'Server: ssh.example.test\nBenutzer: deploy\nPasswort: EXAMPLE-hunter2-EXAMPLE',
    'WLAN: Gaestenetz\nSchlüssel: EXAMPLE-8f3k-q2m9-x7vd',
    'Recovery-Codes:\nEXAMPLE-0001  EXAMPLE-0002\nEXAMPLE-0003  EXAMPLE-0004',
    'API_TOKEN=ghp_EXAMPLEEXAMPLEEXAMPLEEXAMPLE0000',
    'SMTP: smtp.example.test:587\nBenutzer: mailer\nPasswort: EXAMPLE-smtp-pass',
    '-----BEGIN EXAMPLE PRIVATE KEY-----\nRXhhbXBsZSwgbm90IGEgcmVhbCBrZXk=\n-----END EXAMPLE PRIVATE KEY-----',
];
