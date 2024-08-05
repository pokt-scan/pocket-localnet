## Requirements:
1. Node 18+
2. Yarn

## How to use

### Install

```shell
yarn install
```

### Create a relayer working file

Create a copy of `data.sample.json` set your desired values.

Here you have an explanation of every field:

```json
{
  // where u get the session, u need at least 1
  "rpcUrls":  ["http://localhost:8081"],
  // add any servicer address that u want/expect to receive the relay for the app
  "whitelistedServicers": ["address1", "OR LEAVE EMPTY ARRAY"],
  // application private key that will be used to dispatch the relays
  "appPrivKey": "",
  // add chain/app data that will be delivered to the blockchain using relays format
  "chain": {
    "id": "000X",
    "callSet": [
      {
        // default GET
        "method": "GET",
        // default /
        "path": "/",
        // required - not empty string (pocket nodes will reject otherwise)
        "data": ""
      }
    ]
  },
  // enable to call mesh url
  "mesh": {
    "enabled": true,
    "rpcUrl": "http://localhost:9081"
  },
  // how many relays
  "relays": 1,
  // turn on to log every relay request/response to a log file
  "logRelayData": false,
  // path of file to log relays. Only used if logRelaysToFile is on.
  "logFile": "relays.log"
}

```


### Run it:

Use absolute or relative path to your json file create from `data.sample.json`
```shell
DATA_PATH=<PATH/TO/DATA/FILE> yarn start
```
