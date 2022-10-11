const Sodium = require('libsodium-wrappers')
const sha256 = require('js-sha256').sha256;

function addressFromPublicKey(publicKey) {
    const hash = sha256.create()
    hash.update(publicKey)
    return Buffer.from(hash.hex(), 'hex').slice(0, 20)
}

(function(){
    Sodium.ready.then(() => {
        const keypair = Sodium.crypto_sign_keypair()
        const private_key = Buffer.from(keypair.privateKey)
        const public_key = Buffer.from(keypair.publicKey)

        const privateKeyBase64 = private_key.toString('base64')
        const publicKeyBase64 = public_key.toString('base64')

        const nodeKey = {
            priv_key: {
                type: 'tendermint/PrivKeyEd25519',
                value: privateKeyBase64,
            },
        }

        const privValKey = {
            address: addressFromPublicKey(public_key).toString('hex').toUpperCase(),
            pub_key: {
                type: 'tendermint/PubKeyEd25519',
                value: publicKeyBase64,
            },
            priv_key: {
                type: 'tendermint/PrivKeyEd25519',
                value: privateKeyBase64,
            },
        }

        console.log(JSON.stringify({
            private_key: private_key.toString('hex'),
            public_key: public_key.toString('hex'),
            address: addressFromPublicKey(public_key).toString('hex'),
            nodeKey,
            privValKey,
        }, null, 2))
    }).catch((e) => {
        console.trace(e)
    }).finally(() => {
        process.exit(0)
    })
})()
