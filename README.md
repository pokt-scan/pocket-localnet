# pocket-localnet
Tooling to run a localnet of Pocket Network

### DISCLAIMER

This is an overnight tooling to help the community to test this. If you face any issue please let us know.

### Requirements:
* Docker
* Docker Compose
* 4CPU / 16GB RAM / 20GB Disk or more (maybe a bit less is ok too)

### Preparatives

1. Run: `mkdir -p ~/pocket-dev` - Create a folder to hold localnet and pocket-core repositories. (this could be whatever you want)
2. Run: `git clone https://github.com/pokt-scan/pocket-localnet.git` - Clone at same level of  pocket-core
3. Run: `git clone https://github.com/pokt-network/pocket-core.git` - Clone at same level of pocket-localnet
4. Run: `cd pocket-core` - move into pocket-core folder
5. Run: `git checkout geo-mesh` - or any other branch that contains a Geo-Mesh code.
6. Run: `cd ../pocket-localnet` - move to this repository folder
7. Run: `docker-compose build` - build Pocket image, if this generates any error probably related to paths.
8. Run `cp config/sample.chains.json config/chains.json` and then edit it to point to a valid Ethereum Mainnet network. (here u can use a free Infura endpoint if u want)
9. Run: `cd relayer & yarn` - install nodejs dependencies using yarn package manager for the "relay" runner script.
10. Create a `.env` file inside of `pocket-localnet` folder with the following values:
    ```dotenv
    # max amount of relays dispatched
    MAX_RELAYS=500
    # max amount of concurrent relays delivered
    MAX_CONCURRENT=50
    # max amount of round - relayer will sleep 1ms between rounds.
    MAX_ROUNDS=1
    ```
11. Edit your `/etc/hosts` file and add the below entries that allow handle all the nodes using local domains
    ```text
    127.0.0.1       node1.dev
    127.0.0.1       node2.dev
    127.0.0.1       lean.dev
    127.0.0.1       mesh.dev
    ```

### Start Pocket LocalNet + Geo-Mesh:

1. Run: `cd pocket-localnet` - move to pocket-localnet repository
2. Run: `docker-compose up --build -d` - it starts: 2 validators, 1 lean node with 20 servicers, 1 mesh to serve all of previous mentioned

### Test Pocket LocalNet

1. Open your browser and navigate to: http://localhost:26647/status and check that `latest_block_height` value is greater than 0. This mean the LocalNet is producing blocks properly.
   * NOTE: Refresh page to see new values. Wait until `latest_block_height` > 0
2. Run: `cd pocket-localnet/relayer` - move into relayer tool folder
3. Run: `yarn start` - run relayer tool using `.env` variables
4. Wait a while and query the nodes to check the "claims":
   1. Claims: `curl -X POST --location "http://localhost:8081/v1/query/nodeclaims" -H "Accept: application/json" -H "Content-Type: application/json" -d "{ \"height\": 0 }"`
   2. Txs: `curl -X POST --location "http://localhost:8081/v1/query/blocktxs" -H "Accept: application/json" -H "Content-Type: application/json" -d "{ \"height\": 0 }"`
      * NOTE: once u see claims and few blocks later they go ago, you can query the txs to see the `proof` and check `stdTx.result_code` is equal to 0
   
### Stop Pocket LocalNet

1. Run: `cd pocket-localnet` - move to pocket-localnet repository
2. Run: `docker-compose stop` - destroy all the containers.

### Reset Pocket LocalNet

1. Run: `cd pocket-localnet` - move to pocket-localnet repository
2. Run: `docker-compose down` - destroy all the containers.
3. Run: `docker volume rm pocket-localnet_node1 && docker volume rm pocket-localnet_node2 && docker volume rm pocket-localnet_lean && docker volume rm pocket-localnet_mesh`
   * NOTE: docker-compose contains volume label "pocket=localnet" but `docker volume prune --filter "label=pocket"` or `docker volume prune --filter "pocket=localnet"` is not working as expected. 
4. Run again from "Start Pocket LocalNet + Geo-Mesh"

### Extra Tooling
If u want/need add more accounts/apps/nodes you could use our Generator under `generator` folder to get simple nodejs script that will produce wallet files that you can use on this localnet.
To use those, you will need to add them to `config/genesis.json` and reset your localnet.