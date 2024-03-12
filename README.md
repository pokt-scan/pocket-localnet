# pocket-localnet
Tooling to run a localnet of Pocket Network

### DISCLAIMER

This is an overnight tooling to help the community to test this. If you face any issue please let us know.

### Requirements:
* Docker
* Docker Compose
* 4CPU / 16GB RAM / 20GB Disk or more (maybe a bit less is ok too)

### Building

1. Clone the mesh-enabled version of Pocket-Core `cd .. && git clone https://github.com/pokt-scan/pocket-core.git`. By default it is expected to be cloned at the same level as this repository, like: `/foo/pocket-localnet` and `/foo/pocket-core`. If you choose to clone the `pocket-core` repo in another folder, like `/bar/pocket-core` just change the `.env` file at the root of `pocket-localnet` accordingly: `POCKET_CORE_REPO_LOCATION=/bar/pocket-core`.
2. Checkout a geo-mesh branch: `git checkout geo-mesh-dockerfile`
3. Return to this repository folder `cd ../pocket-localnet`
4. Build the images `docker-compose build`.
5. Run `cp config/sample.chains.json config/chains.json` and then edit it to point to a valid Ethereum Mainnet network. You can get one from [Pocket Public Endpoints](https://docs.pokt.network/developers/public-endpoints). It should look like this (keep in mind that the url can change):
```json
[
   {
      "id": "0021",
      "url": "https://eth-pokt.nodies.app/",
      "basic_auth": {
         "username": "",
         "password": ""
         }
   }
]
```
6. Edit your `/etc/hosts` file and add the below entries that allow handle all the nodes using local domains
```text
127.0.0.1 lean1.dev
127.0.0.1 lean2.dev
127.0.0.1 lean3.dev
127.0.0.1 mesh.dev
```

  
##### Optional - Local Relayer

1. Run `cd relayer & yarn` to install nodejs dependencies using yarn package manager for the "relay" runner script.
2. Create a `.env` file inside of `pocket-localnet/relayer`. This file indicates the amount of relays that you want to test, for example:
```dotenv
# max amount of relays dispatched
MAX_RELAYS=500
# max amount of concurrent relays delivered
MAX_CONCURRENT=50
# max amount of round - relayer will sleep 1ms between rounds.
MAX_ROUNDS=1
```

### Start Pocket LocalNet + Geo-Mesh:

Just run `docker-compose up --build -d`. If it fails, remove volumes (`docker compose down --volumes`) and retry.
This will create:
- 3 lean nodes with 20 servicers
- 1 mesh to serve all servicers


### Test Pocket LocalNet

1. Open your browser and navigate to: http://localhost:26647/status and check that `latest_block_height` (under `sync_info`) value is greater than 0. It will take some time to produce a block, have patience. Once `latest_block_height > 0`, it means the LocalNet is producing blocks properly.
   * NOTE: Refresh page to see new values.
2. (optional for local relayer) Run `cd relayer` to move into relayer tool folder.
3. (optional for local relayer) Create logs folder if not present `mkdir logs`
4. (optional for local relayer) Run `yarn start` to run relayer tool using `.env` variables
5. Wait for next session and then query the nodes to check (`height: 0` is for latest block):
   1. Run the following command:
   ```bash 
   curl -X POST --location "http://localhost:8081/v1/query/nodeclaims" -H "Accept: application/json" -H "Content-Type: application/json" -d "{ \"height\": 0 }" && curl -X POST --location "http://localhost:8081/v1/query/blocktxs" -H "Accept: application/json" -H "Content-Type: application/json" -d "{ \"height\": 0 }"
   ```
   If the response is:
   ```
   {"page":0,"result":null,"total_pages":0}
   {"page_count":0,"total_txs":0,"txs":[]}
   ```
   You will have to wait for the end of the session + 1 block. This means, that if you did the relays before height 4 you will see the claims at height 6. The claims look like this:
   ```
   {"page":1,"result":[{"evidence_type":1,"expiration_height":54,"from_address":"7c08e2e1265246a66d7d022b163970114dda124e","header":{"app_public_key":"1802f4116b9d3798e2766a2452fbeb4d280fa99e77e61193df146ca4d88b38af","chain":"0021","session_height":1},"merkle_root":{"merkleHash":"uYm2bGa5AdwGDxznLgbHOiISPBWvvcpbp4un6L4niuo=","range":{"lower":0,"upper":18304175044132730000}},"total_proofs":100}],"total_pages":1}
   {"page_count":1,"total_txs":1,"txs":[{"hash":"79E411C628D94246A85D87F50AFDC9BE521FD6A91F2C26FEB80CFE917CB62A2B","height":6,"index":0,"proof":{"data":null,"proof":{"aunts":null,"index":0,"leaf_hash":null,"total":0},"root_hash":""},"stdTx":{"entropy":-251686110079666400,"fee":[{"amount":"10000","denom":"upokt"}],"memo":"","msg":{"type":"pocketcore/claim","value":{"evidence_type":"1","expiration_height":"0","from_address":"7c08e2e1265246a66d7d022b163970114dda124e","header":{"app_public_key":"1802f4116b9d3798e2766a2452fbeb4d280fa99e77e61193df146ca4d88b38af","chain":"0021","session_height":"1"},"merkle_root":{"merkleHash":"uYm2bGa5AdwGDxznLgbHOiISPBWvvcpbp4un6L4niuo=","range":{"lower":"0","upper":"18304175044132730878"}},"total_proofs":"100"}},"signature":{"pub_key":"33e1eac17dfce97abaa1387db52cea318edce277bfe5c790448f8ba22f602800","signature":"7647798e27472282f726d1a5bffe83fe7dc82d3cd658b6bc7e4a9e1251f64bc9e15e3a80afe33ae5a77a600b23870a11d1a02926222320a03603e6bce6e6e002"}},"tx":"qALbCxcNCpsBq4P6fApKCkAxODAyZjQxMTZiOWQzNzk4ZTI3NjZhMjQ1MmZiZWI0ZDI4MGZhOTllNzdlNjExOTNkZjE0NmNhNGQ4OGIzOGFmEgQwMDIxGAESLwoguYm2bGa5AdwGDxznLgbHOiISPBWvvcpbp4un6L4niuoSCxD+7+egkcffgv4BGGQiFHwI4uEmUkambX0CKxY5cBFN2hJOKAESDgoFdXBva3QSBTEwMDAwGmkKJZ1UR3QgM+HqwX386Xq6oTh9tSzqMY7c4ne/5ceQRI+Loi9gKAASQHZHeY4nRyKC9ybRpb/+g/59yC081li2vH5KnhJR9kvJ4V46gK/jOuWnemALI4cKEdGgKSYiIyCgNgPmvObm4AIoqO607o+a9cD8AQ==","tx_result":{"code":0,"codespace":"","data":null,"events":null,"info":"","log":"","message_type":"claim","recipient":"","signer":"7C08E2E1265246A66D7D022B163970114DDA124E"}}]}
   ```
   2. After the proof window passes, you can query the txs to see the `proof` and check if `stdTx.result_code` is equal to 0.

   
   
### Stop Pocket LocalNet

Simply run `docker-compose stop` to destroy all the containers.


### Reset Pocket LocalNet

If you want to go back to the genesis (block 0) and have a clean network, you need to destroy all volumes using `docker-compose down --volumes`.

Depending on the Docker install this command might not erase qll volumes (you can check using `docker volume list`). In that case you can force the deletion by doing:
1. Run `docker-compose down` to destroy all the containers (if not already done).
2. Run `docker volume rm pocket-lean1_localnet && docker volume rm pocket-lean2_localnet && docker volume rm pocket-lean3_localnet && docker volume rm pocket-localnet_mesh && docker volume rm pocket-relayer`
   * NOTE: docker-compose contains volume label "pocket=localnet" but `docker volume prune --filter "label=pocket"` or `docker volume prune --filter "pocket=localnet"` is not working as expected.

After deleting the volumes you can restart the service following section "Start Pocket LocalNet + Geo-Mesh"


### Extra Tooling
If you want/need add more accounts/apps/nodes you could use our Generator under `generator` folder to get simple nodejs script that will produce wallet files that you can use on this localnet.
To use those, you will need to add them to `config/genesis.json` and reset your localnet, following the steps on "Reset Pocket LocalNet".