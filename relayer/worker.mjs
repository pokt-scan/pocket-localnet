import {Relayer} from "@pokt-foundation/pocketjs-relayer";
import {JsonRpcProvider} from "@pokt-foundation/pocketjs-provider";
import {KeyManager} from "@pokt-foundation/pocketjs-signer";
import {PocketAAT} from "@pokt-network/aat-js";
import _ from "lodash";
import { workerData } from 'piscina'

async function initialize() {
    const logToFile = _.isBoolean(workerData.logRelayData) && workerData.logRelayData

    // Instantiate a provider for querying information on the chain!
    const provider = new JsonRpcProvider({
        rpcUrl: _.sample(workerData.rpcUrls),
        dispatchers: workerData.rpcUrls,
    });

    // Instantiate a signer for importing an account and signing messages!
    const appKeyManager = await KeyManager.fromPrivateKey(workerData.appPrivKey);
    const appPubKey = appKeyManager.getPublicKey();
    const pocketAAT = await PocketAAT.from(
      "0.0.1",
      appPubKey, // aat
      appPubKey,
      workerData.appPrivKey,
    )

    // create a relayer to get a session
    const relayer = new Relayer({
        keyManager: appKeyManager,
        provider,
        dispatchers: workerData.rpcUrls,
    });

    // get a session for the chain id
    const session = await relayer.getNewSession({
        chain: workerData.chain.id,
        applicationPubKey: appPubKey,
    });

    const nodes = []

    session.nodes.forEach(node => {
        let selectedNode = null

        if(workerData.whitelistedServicers.length > 0) {
            if(workerData.whitelistedServicers.includes(node.address)) {
                selectedNode = node
            }
        } else {
            selectedNode = node
        }

        if(!selectedNode) return

        // if mesh is enabled the nodes url will be the one on the mesh
        if(workerData.mesh !== null && workerData.mesh.enabled === true) {
            selectedNode.serviceUrl = workerData.mesh.rpcUrl
        }

        nodes.push(selectedNode)
    })

    if(nodes.length === 0) {
        throw new Error("we are unable to get at least 1 node to service relays for the app + chain right now.")
    }

    // override session nodes with the whitelisted, or they will be everyone with mesh or not.
    session.nodes = nodes

    return async () => {
        const relayer = new Relayer({
            keyManager: appKeyManager,
            provider,
            // set node url as dispatchers
            dispatchers: session.nodes.map(n => n.serviceUrl),
        });

        const rpcData = _.sample(workerData.chain.callSet)

        const startTime = new Date()

        const analytics = {
            success: true,
            errorMsg: undefined,
            relayTime: 0,
            node: undefined,
            session: session,
            debug: {
                hash: "",
                request: logToFile ? rpcData : null,
                response: null,
            }
        }

        const relay = {
            data: rpcData.data,
            blockchain: workerData.chain.id,
            pocketAAT: pocketAAT,
            session: session,
            options: {
                timeout: 180000,
            }
        }

        if(!_.isEmpty(rpcData.method)) {
            relay.method = rpcData.method
        }

        if(!_.isEmpty(rpcData.path)) {
            relay.path = rpcData.path
        }

        try {
            const relayResponse = await relayer.relay(relay)

            analytics.debug.hash = relayResponse.relayProof.requestHash

            if (relayResponse.serviceNode) {
                analytics.node = `${relayResponse.serviceNode.address}@${relayResponse.serviceNode.serviceUrl.toString()}`
            }

            if (logToFile) {
                analytics.debug.response = relayResponse.response
            }
        } catch (e) {
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
