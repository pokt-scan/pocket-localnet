const sha256 = require('js-sha256').sha256;

(function () {
  const private_key_buffer = Buffer.from(process.argv[2], 'hex')
  const pub_key_buffer = Buffer.from(private_key_buffer.slice(32, private_key_buffer.length))
  const hash = sha256.create()
  hash.update(pub_key_buffer)
  const address_buffer = Buffer.from(hash.hex(), 'hex').slice(0, 20)

  console.log(JSON.stringify({
    private_key: private_key_buffer.toString('hex'),
    public_key: pub_key_buffer.toString('hex'),
    address: address_buffer.toString('hex'),
  }, null, 2))

  process.exit(0)
})()
