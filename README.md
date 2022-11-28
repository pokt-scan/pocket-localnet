# pocket-localnet
Tooling to run a localnet of Pocket Network

### DISCLAIMER

This is a overnight tooling to help the community to test this. If you face any issue please let us know.

### Requirements:
* Docker
* Docker Compose
* 20gb or more (maybe a bit less is ok too)
* Build [Pocket client](doc/guides/development.md) and place on your $PATH
* Nodejs & Yarn (if u wish to use relayer tool)
* Edit your /etc/hosts to handle all the nodes local domains
```txs
127.0.0.1       node1.dev
127.0.0.1       node2.dev
127.0.0.1       local1.dev
127.0.0.1       local2.dev
127.0.0.1       local3.dev
127.0.0.1       local4.dev
127.0.0.1       local5.dev
127.0.0.1       local6.dev
127.0.0.1       local7.dev
127.0.0.1       local8.dev
127.0.0.1       local9.dev
127.0.0.1       local10.dev
127.0.0.1       local11.dev
127.0.0.1       local12.dev
127.0.0.1       local13.dev
127.0.0.1       local14.dev
127.0.0.1       local15.dev
127.0.0.1       local16.dev
127.0.0.1       local17.dev
127.0.0.1       local18.dev
127.0.0.1       local19.dev
127.0.0.1       local20.dev
```

### How to Use:

Clone pocket core at same level of pocket-localnet as pocket-core
`git clone https://github.com/pokt-scan/pocket-localnet.git`
`git clone https://github.com/pokt-network/pocket-core.git`
`cd pocket-code`
`git checkout mesh-node`

1. Create at your $HOME a pocket folder like `mkdir -p ~/.pocket`
2. Copy `config` folder files to `$HOME/.pocket` folder 
3. Create at your $HOME a pocket mesh folder like `mkdir -p ~/.pocket-mesh`
4. Copy `mesh_node` folder files to `$HOME/.pocket-mesh` folder
5. Start docker-compose nodes with: `docker-compose up -d`
6. Start local node `pocket start --datadir $HOME/.pocket --keybase=false --forceSetValidators --simulateRelays`
7. Start Mesh node `pocket start-mesh --datadir $HOME/.pocket-mesh --simulateRelays`
8. Navigate or use curl to know the localnet status: http://localhost:26657/status and check block says 1

Optional:
1. Install relayer dependencies: `yarn`
2. Modify .env if u want
3. Run it: `yarn start`

### Extra

Under `generator` folder you can find a simple nodejs script that will generate wallet files that you can use to add more apps/wallets/nodes to this localnet