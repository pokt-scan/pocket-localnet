import {Relayer} from "@pokt-foundation/pocketjs-relayer";
import {JsonRpcProvider} from "@pokt-foundation/pocketjs-provider";
import {KeyManager} from "@pokt-foundation/pocketjs-signer";
import {PocketAAT} from "@pokt-network/aat-js";
import _ from "lodash";

const APP_PRIVATE_KEY = "6d7d9e78fd62b524cfa76a298b6f9653445449bc22960224901a5bb993ba52cb1802f4116b9d3798e2766a2452fbeb4d280fa99e77e61193df146ca4d88b38af"
const APP_CHAIN = "0021"

const VALIDATOR_1_URL = "http://localhost:8081"
const VALIDATOR_2_URL = "http://localhost:8091"
const LEAN_URL = "http://localhost:8071"
const MESH_URL = "http://localhost:9081"
const DISPATCHERS = [
    VALIDATOR_1_URL,
    VALIDATOR_2_URL,
    LEAN_URL,
]
const RELAY_DATA = [
    "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"0xF02c1c8e6114b1Dbe8937a39260b5b0a374432bB\", \"latest\"],\"id\":1}"
]
const NODES = {
    "7c08e2e1265246a66d7d022b163970114dda124e": MESH_URL,
    "9ab105b900c4633657f60974ad0e243c8f50ae1e": MESH_URL,
    "5e6949faf0a176fd0f3a0e2ef948d7a70ee2867b": MESH_URL,
    "4202057f345d63b0af02f76dcb42aa46bf9b6d43": MESH_URL,
    "a31eba7042bd2c87c5dc0462d92dd1c961c81249": MESH_URL,
    "d1dd513de5a3c1f05b6c534c840f76e60caf3662": MESH_URL,
    "a4357688f25b1daa3270c287c0fbb75bb020c1ce": MESH_URL,
    "b0c626b04d5f0ab76e764409fc9bafb6cab2c1b1": MESH_URL,
    "278d9f242d3ddffce8ede6d9c86e47fb57b502f5": MESH_URL,
    "b3f65b5c8da10132b107aaa1c38542ffb73dea35": MESH_URL,
    "fb4201bec1209a1af58a9df113d0998503a70c7f": MESH_URL,
    "e441b6024deb682291abff461bf9cc855f5ae659": MESH_URL,
    "d8f7226ec86e62739b84aaa8898d8b7b8c2e3025": MESH_URL,
    "f89f49b6a978ddfc7402b7bd0efca8715c1d7d5e": MESH_URL,
    "6fa859c95b450a589d1a837338c0b7ffbde6872b": MESH_URL,
    "3c107bcbd07db3a43882fa20c41bae5904aa0677": MESH_URL,
    "580751119d154cb508ac024bcab772e04c4714e2": MESH_URL,
    "56f4af690d1ac39b8f4c4fb9892ede2757e94624": MESH_URL,
    "34755f065d73a7743bf3f149660e0392b878317b": MESH_URL,
    "b2e33301ae084ab010a7eae571c632e37a6083c5": MESH_URL,
    "b35edc63b62aa1b53d75f7f8bc5c6db2a84958fb": MESH_URL,
    "621993ee115ad88682ed401e213e7b389e296832": MESH_URL,
}


async function initialize() {
    // Instantiate a provider for querying information on the chain!
    const provider = new JsonRpcProvider({
        rpcUrl: _.sample(DISPATCHERS),
        // If you'll Instantiate a relayer, you need to add dispatchers as well
        dispatchers: DISPATCHERS,
    });

    // Instantiate a signer for importing an account and signing messages!
    const appKeyManager = await KeyManager.fromPrivateKey(APP_PRIVATE_KEY);

    const appPubKey = appKeyManager.getPublicKey();

    const pocketAAT = await PocketAAT.from(
        "0.0.1",
        appPubKey, // aat
        appPubKey,
        APP_PRIVATE_KEY,
    )

    const relayer = new Relayer({
        keyManager: appKeyManager,
        provider,
        dispatchers: DISPATCHERS,
    });

    return async () => {
        let node
        const startTime = new Date()

        const session = await relayer.getNewSession({
            chain: APP_CHAIN,
            applicationPubKey: appPubKey,
        });

        const analytics = {
            success: true,
            errorMsg: undefined,
            relayTime: 0,
            node: undefined,
            session: session,
        }

        let notInSession = true

        while (notInSession) {
            const sessionNode = _.sample(session.nodes)
            if (NODES[sessionNode.address]) {
                notInSession = false
                sessionNode.serviceUrl = NODES[sessionNode.address]
                node = sessionNode
            }
        }

        try {
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
            console.log("errored relay", e.message)
            analytics.success = false
            analytics.errorMsg = e.message
        } finally {
            // Measure relay execution time
            const endTime = new Date()
            // Fill analytics
            analytics.relayTime = endTime - startTime
        }

        return analytics
    };
}

export default initialize();