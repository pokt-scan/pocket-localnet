import {JsonRpcProvider} from "@pokt-foundation/pocketjs-provider";
import {KeyManager} from "@pokt-foundation/pocketjs-signer";
import {Relayer} from "@pokt-foundation/pocketjs-relayer";
import {PocketAAT} from '@pokt-network/aat-js'
import pLimit from "p-limit";
import _ from "lodash";

const APP_PRIVATE_KEY = "6d7d9e78fd62b524cfa76a298b6f9653445449bc22960224901a5bb993ba52cb1802f4116b9d3798e2766a2452fbeb4d280fa99e77e61193df146ca4d88b38af"
const APP_CHAIN = "0021"
const DISPATCHERS = ["http://localhost:9081", "http://localhost:8081"]
const RELAY_DATA = [
    "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"0xF02c1c8e6114b1Dbe8937a39260b5b0a374432bB\", \"latest\"],\"id\":1}"
]
const NODES = ["5e6949faf0a176fd0f3a0e2ef948d7a70ee2867b"]

function sleep(ms) {
    console.log("info", `process sleep ${ms}ms`)
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const meshesNodes = ["http://localhost:9081"]

const run = async () => {
    // Instantiate a provider for querying information on the chain!
    const provider = new JsonRpcProvider({
        rpcUrl: DISPATCHERS[0],
        // If you'll Instantiate a relayer, you need to add dispatchers as well
        dispatchers: DISPATCHERS,
    });

    // Instantiate a signer for importing an account and signing messages!
    const appKeyManager = await KeyManager.fromPrivateKey(APP_PRIVATE_KEY);

    const appPubKey = appKeyManager.getPublicKey();

    // Create a new relayer to send relays over the network!
    const relayer = new Relayer({
        keyManager: appKeyManager,
        provider,
        dispatchers: DISPATCHERS,
    });

    let round = Number(process.env.MAX_ROUNDS || 1)
    while (round < 10) {
        console.log("info", "Round Start", round)
        console.log("debug", "get a new session")
        const session = await relayer.getNewSession({
            chain: APP_CHAIN,
            applicationPubKey: appPubKey,
        });
        console.log("debug", "filter session node list with desired one")
        const nodes = _.filter(session.nodes, n => _.includes(NODES, n.address))
        // session.
        console.log("debug", "generate aat")
        const pocketAAT = await PocketAAT.from(
            "0.0.1",
            appPubKey, // aat
            appPubKey,
            APP_PRIVATE_KEY,
        )
        console.log("debug", "prepare concurrency limit")
        const limit = pLimit(Number(process.env.MAX_CONCURRENT || 10));
        const tasks = [];
        const totalRelays = Number(process.env.MAX_RELAYS || 1000)
        console.log("debug", "adding concurrent requests")
        for (let i = 0; i < totalRelays; i++) {
            tasks.push(limit(async () => {
                const analytics = {
                    success: true,
                    errorMsg: undefined,
                    relayTime: 0,
                    node: undefined,
                    session: session,
                }

                // Measure relay execution time
                const startTime = new Date()

                let node

                if (nodes.length > 0) {
                    node = _.sample(nodes)
                }

                try {
                    node.serviceUrl = _.sample(meshesNodes)//"http://local1.dev:9081"
                    const relay = await relayer.relay({
                        data: RELAY_DATA[0],
                        blockchain: APP_CHAIN,
                        pocketAAT: pocketAAT,
                        session: session,
                        node,
                        options: {
                            timeout: 180000,
                        }
                    })

                    if (relay.serviceNode) {
                        analytics.node = `${relay.serviceNode.address}@${relay.serviceNode.serviceUrl.toString()}`
                    }
                } catch (e) {
                    console.info(e.message)
                    analytics.success = false
                    analytics.errorMsg = e.message
                } finally {
                    // Measure relay execution time
                    const endTime = new Date()
                    // Fill analytics
                    analytics.relayTime = endTime - startTime
                }

                return analytics
            }))
        }

        console.log("debug", "waiting results")
        const results = await Promise.allSettled(tasks)

        let goodRelays = 0
        let goodRelaysTime = 0
        let badRelays = 0
        const relaysByNode = {}

        console.log("debug", "analyze results")
        results.forEach(p => {
            if (p.status === 'rejected' || !p.value.success) {
                badRelays++
            } else {
                goodRelays++
                goodRelaysTime += p.value.relayTime
                if (relaysByNode[p.value.node]) relaysByNode[p.value.node]++
                else relaysByNode[p.value.node] = 1
            }
        })

        console.log("info", "Round End", round)
        console.log("info", '=======================================================================')
        console.log("info", `Good Relays: ${goodRelays}`)
        console.log("info", `Relays MS Avg: ${goodRelays > 0 ? goodRelaysTime / goodRelays : 0}`)
        console.log("info", `Bad Relays: ${badRelays}`)
        console.log("info", JSON.stringify(relaysByNode, null, 2))
        console.log("info", '=======================================================================')

        await sleep(10000);
        round++
    }
}

(function () {
    run().catch((e) => console.trace(e))
})()