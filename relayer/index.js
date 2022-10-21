import {JsonRpcProvider} from "@pokt-foundation/pocketjs-provider";
import {KeyManager} from "@pokt-foundation/pocketjs-signer";
import {Relayer} from "@pokt-foundation/pocketjs-relayer";
import {PocketAAT} from '@pokt-network/aat-js'
import pLimit from "p-limit";
import _ from "lodash";

const APP_PRIVATE_KEY = "6d7d9e78fd62b524cfa76a298b6f9653445449bc22960224901a5bb993ba52cb1802f4116b9d3798e2766a2452fbeb4d280fa99e77e61193df146ca4d88b38af"
const APP_CHAIN = "0021"
const DISPATCHERS = [
    "http://localhost:9081",
    // "http://localhost:8081",
]
const RELAY_DATA = [
    "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"0xF02c1c8e6114b1Dbe8937a39260b5b0a374432bB\", \"latest\"],\"id\":1}"
]
const NODES = [
    "5e6949faf0a176fd0f3a0e2ef948d7a70ee2867b",
    "4202057f345d63b0af02f76dcb42aa46bf9b6d43",
    "a31eba7042bd2c87c5dc0462d92dd1c961c81249",
    "d1dd513de5a3c1f05b6c534c840f76e60caf3662",
    "a4357688f25b1daa3270c287c0fbb75bb020c1ce",
    "b0c626b04d5f0ab76e764409fc9bafb6cab2c1b1",
    "278d9f242d3ddffce8ede6d9c86e47fb57b502f5",
    "b3f65b5c8da10132b107aaa1c38542ffb73dea35",
    "fb4201bec1209a1af58a9df113d0998503a70c7f",
    "e441b6024deb682291abff461bf9cc855f5ae659",
    "d8f7226ec86e62739b84aaa8898d8b7b8c2e3025",
    "f89f49b6a978ddfc7402b7bd0efca8715c1d7d5e",
    "6fa859c95b450a589d1a837338c0b7ffbde6872b",
    "3c107bcbd07db3a43882fa20c41bae5904aa0677",
    "580751119d154cb508ac024bcab772e04c4714e2",
    "56f4af690d1ac39b8f4c4fb9892ede2757e94624",
    "34755f065d73a7743bf3f149660e0392b878317b",
    "b2e33301ae084ab010a7eae571c632e37a6083c5",
    "b35edc63b62aa1b53d75f7f8bc5c6db2a84958fb",
    "621993ee115ad88682ed401e213e7b389e296832",
]

function sleep(ms) {
    console.log("info", `process sleep ${ms}ms`)
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

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

    let round = 1
    const maxRounds = Number(process.env.MAX_ROUNDS || 1)
    while (round <= maxRounds) {
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
                    node.serviceUrl = _.sample(DISPATCHERS)
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

        if (round < maxRounds) {
            await sleep(10000);
        }
        round++
    }
    console.log(`done after ${maxRounds} rounds`)
    process.exit(0)
}

(function () {
    run().catch((e) => console.trace(e))
})()