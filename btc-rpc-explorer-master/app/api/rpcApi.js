"use strict";

const debug = require('debug');
const debugLog = debug("btcexp:rpc");

const async = require("async");
const semver = require("semver");

const utils = require("../utils.js");
const config = require("../config.js");
const coins = require("../coins.js");
const statTracker = require("../statTracker.js");

let activeQueueTasks = 0;

const rpcQueue = async.queue(function(task, callback) {
	activeQueueTasks++;
	//debugLog("activeQueueTasks: " + activeQueueTasks);

	task.rpcCall(function() {
		callback();

		activeQueueTasks--;
		//debugLog("activeQueueTasks: " + activeQueueTasks);
	});

}, config.rpcConcurrency);

const minRpcVersions = {
	getblockstats: "0.17.0",
	getindexinfo: "0.21.0",
	getdeploymentinfo: "23.0.0"
};

global.rpcStats = {};



function getBlockchainInfo() {
	return new Promise((resolve, reject) => {
		getRpcData("getblockchaininfo").then((getblockchaininfo) => {
			// keep global.pruneHeight updated
			if (getblockchaininfo.pruned) {
				global.pruneHeight = getblockchaininfo.pruneheight;
			}

			resolve(getblockchaininfo);
			
		}).catch(reject);
	});
	
}

function getBlockCount() {
	return getRpcData("getblockcount");
}

function getNetworkInfo() {
	return getRpcData("getnetworkinfo");
}

function getNetTotals() {
	return getRpcData("getnettotals");
}

function getMempoolInfo() {
	return getRpcData("getmempoolinfo");
}

function getMiningInfo() {
	return getRpcData("getmininginfo");
}

function getIndexInfo() {
	if (semver.gte(global.btcNodeSemver, minRpcVersions.getindexinfo)) {
		return getRpcData("getindexinfo");

	} else {
		// unsupported
		return unsupportedPromise(minRpcVersions.getindexinfo);
	}
}

function getDeploymentInfo() {
	if (semver.gte(global.btcNodeSemver, minRpcVersions.getdeploymentinfo)) {
		return getRpcData("getdeploymentinfo");

	} else {
		// unsupported
		return unsupportedPromise(minRpcVersions.getdeploymentinfo);
	}
}

function getUptimeSeconds() {
	return getRpcData("uptime");
}

function getPeerInfo() {
	return getRpcData("getpeerinfo");
}

function getBlockTemplate() {
	return getRpcDataWithParams({method:"getblocktemplate", parameters:[{"rules": ["segwit"]}]});
}

function getAllMempoolTxids() {
	return getRpcDataWithParams({method:"getrawmempool", parameters:[false]});
}

function getSmartFeeEstimate(mode="CONSERVATIVE", confTargetBlockCount) {
	return getRpcDataWithParams({method:"estimatesmartfee", parameters:[confTargetBlockCount, mode]});
}

function getNetworkHashrate(blockCount=144) {
	return getRpcDataWithParams({method:"getnetworkhashps", parameters:[blockCount]});
}

function getBlockStats(hash) {
	if (semver.gte(global.btcNodeSemver, minRpcVersions.getblockstats)) {
		if (hash == coinConfig.genesisBlockHashesByNetwork[global.activeBlockchain] && coinConfig.genesisBlockStatsByNetwork[global.activeBlockchain]) {
			return new Promise(function(resolve, reject) {
				resolve(coinConfig.genesisBlockStatsByNetwork[global.activeBlockchain]);
			});

		} else {
			return getRpcDataWithParams({method:"getblockstats", parameters:[hash]});
		}
	} else {
		// unsupported
		return unsupportedPromise(minRpcVersions.getblockstats);
	}
}

function getBlockStatsByHeight(height) {
	if (semver.gte(global.btcNodeSemver, minRpcVersions.getblockstats)) {
		if (height == 0 && coinConfig.genesisBlockStatsByNetwork[global.activeBlockchain]) {
			return new Promise(function(resolve, reject) {
				resolve(coinConfig.genesisBlockStatsByNetwork[global.activeBlockchain]);
			});
			
		} else {
			return getRpcDataWithParams({method:"getblockstats", parameters:[height]});
		}
	} else {
		// unsupported
		return unsupportedPromise(minRpcVersions.getblockstats);
	}
}

function getUtxoSetSummary(useCoinStatsIndexIfAvailable=true) {
	if (useCoinStatsIndexIfAvailable && global.getindexinfo && global.getindexinfo.coinstatsindex) {
		return getRpcDataWithParams({method:"gettxoutsetinfo", parameters:["muhash"]});

	} else {
		return getRpcData("gettxoutsetinfo");
	}
}

function getRawMempool() {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getrawmempool", parameters:[false]}).then(function(txids) {
			let promises = [];

			for (let i = 0; i < txids.length; i++) {
				let txid = txids[i];

				promises.push(getRawMempoolEntry(txid));
			}

			Promise.all(promises).then(function(results) {
				let finalResult = {};

				for (let i = 0; i < results.length; i++) {
					if (results[i] != null) {
						finalResult[results[i].txid] = results[i];
					}
				}

				resolve(finalResult);

			}).catch(function(err) {
				reject(err);
			});

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getRawMempoolEntry(txid) {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getmempoolentry", parameters:[txid]}).then(function(result) {
			result.txid = txid;

			resolve(result);

		}).catch(function(err) {
			resolve(null);
		});
	});
}

function getChainTxStats(blockCount, blockhashEnd=null) {
	let params = [blockCount];
	if (blockhashEnd) {
		params.push(blockhashEnd);
	}

	return getRpcDataWithParams({method:"getchaintxstats", parameters:params});
}

function getBlockByHeight(blockHeight) {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getblockhash", parameters:[blockHeight]}).then(function(blockhash) {
			getBlockByHash(blockhash).then(function(block) {
				resolve(block);

			}).catch(function(err) {
				reject(err);
			});
		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlockHeaderByHash(blockhash) {
	return getRpcDataWithParams({method:"getblockheader", parameters:[blockhash]});
}

function getBlockHeaderByHeight(blockHeight) {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getblockhash", parameters:[blockHeight]}).then(function(blockhash) {
			getBlockHeaderByHash(blockhash).then(function(blockHeader) {
				resolve(blockHeader);

			}).catch(function(err) {
				reject(err);
			});
		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlockHashByHeight(blockHeight) {
	return getRpcDataWithParams({method:"getblockhash", parameters:[blockHeight]});
}

function getBlockByHash(blockHash) {
	return getRpcDataWithParams({method:"getblock", parameters:[blockHash]})
		.then(function(block) {
			return getRawTransaction(block.tx[0], blockHash).then(function(tx) {
				block.coinbaseTx = tx;
				block.totalFees = utils.getBlockTotalFeesFromCoinbaseTxAndBlockHeight(tx, block.height);
				block.miner = utils.identifyMiner(tx, block.height);
				return block;
			})
		}).catch(function(err) {
				// the block is pruned, use `getblockheader` instead
				debugLog('getblock failed, falling back to getblockheader', blockHash, err);
				return getRpcDataWithParams({method:"getblockheader", parameters:[blockHash]})
					.then(function(block) { block.tx = []; return block });
		}).then(function(block) {
				block.subsidy = coinConfig.blockRewardFunction(block.height, global.activeBlockchain);
				return block;
		})
}

function getAddress(address) {
	return getRpcDataWithParams({method:"validateaddress", parameters:[address]});
}

function getRawTransaction(txid, blockhash) {
	return new Promise(function(resolve, reject) {
		if (coins[config.coin].genesisCoinbaseTransactionIdsByNetwork[global.activeBlockchain] && txid == coins[config.coin].genesisCoinbaseTransactionIdsByNetwork[global.activeBlockchain]) {
			// copy the "confirmations" field from genesis block to the genesis-coinbase tx
			getBlockchainInfo().then(function(blockchainInfoResult) {
				let result = coins[config.coin].genesisCoinbaseTransactionsByNetwork[global.activeBlockchain];
				result.confirmations = blockchainInfoResult.blocks;

				// hack: default regtest node returns "0" for number of blocks, despite including a genesis block;
				// to display this block without errors, tag it with 1 confirmation
				if (global.activeBlockchain == "regtest" && result.confirmations == 0) {
					result.confirmations = 1;
				}

				resolve(result);

			}).catch(function(err) {
				reject(err);
			});

		} else {
			let extra_params = blockhash ? [ blockhash ] : [];
			getRpcDataWithParams({method:"getrawtransaction", parameters:[txid, 1, ...extra_params]}).then(function(result) {
				if (result == null || result.code && result.code < 0) {
					return Promise.reject(result);
				}

				resolve(result);

			}).catch(function(err) {
				if (!global.txindexAvailable) {
					noTxIndexTransactionLookup(txid, !!blockhash).then(resolve, reject);
				} else {
					reject(err);
				}
			});
		}
	});
}

async function noTxIndexTransactionLookup(txid, walletOnly) {
	// Try looking up with an external Electrum server, using 'get_confirmed_blockhash'.
	// This is only available in Electrs and requires enabling BTCEXP_ELECTRUM_TXINDEX.
	if (!walletOnly && (config.addressApi == "electrum" || config.addressApi == "electrumx") && config.electrumTxIndex) {
		try {
			let blockhash = await electrumAddressApi.lookupTxBlockHash(txid);

			return await getRawTransaction(txid, blockhash);

		} catch (err) {
			debugLog(`Electrs blockhash lookup failed for ${txid}:`, err);
		}
	}

	// Try looking up in wallet transactions
	for (let wallet of await listWallets()) {
		try { return await getWalletTransaction(wallet, txid); }
		catch (_) {}
	}

	// Try looking up in recent blocks
	if (!walletOnly) {
		let tip_height = await getRpcDataWithParams({method:"getblockcount", parameters:[]});
		for (let height=tip_height; height>Math.max(tip_height - config.noTxIndexSearchDepth, 0); height--) {
			let blockhash = await getRpcDataWithParams({method:"getblockhash", parameters:[height]});
			try { return await getRawTransaction(txid, blockhash); }
			catch (_) {}
		}
	}

	throw new Error(`The requested tx ${txid} cannot be found in wallet transactions, mempool transactions, or recently confirmed transactions`)
}

function listWallets() {
	return getRpcDataWithParams({method:"listwallets", parameters:[]})
}

async function getWalletTransaction(wallet, txid) {
	global.rpcClient.wallet = wallet;
	try {
		return await getRpcDataWithParams({method:"gettransaction", parameters:[ txid, true, true ]})
			.then(wtx => ({ ...wtx, ...wtx.decoded, decoded: null }))
	} finally {
		global.rpcClient.wallet = null;
	}
}

function getUtxo(txid, outputIndex) {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"gettxout", parameters:[txid, outputIndex]}).then(function(result) {
			if (result == null) {
				resolve("0");

				return;
			}

			if (result.code && result.code < 0) {
				reject(result);

				return;
			}

			resolve(result);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getMempoolTxDetails(txid, includeAncDec=true) {
	let promises = [];

	let mempoolDetails = {};

	promises.push(new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getmempoolentry", parameters:[txid]}).then(function(result) {
			mempoolDetails.entry = result;

			resolve();

		}).catch(function(err) {
			reject(err);
		});
	}));

	if (includeAncDec) {
		promises.push(new Promise(function(resolve, reject) {
			getRpcDataWithParams({method:"getmempoolancestors", parameters:[txid]}).then(function(result) {
				mempoolDetails.ancestors = result;

				resolve();

			}).catch(function(err) {
				reject(err);
			});
		}));

		promises.push(new Promise(function(resolve, reject) {
			getRpcDataWithParams({method:"getmempooldescendants", parameters:[txid]}).then(function(result) {
				mempoolDetails.descendants = result;

				resolve();

			}).catch(function(err) {
				reject(err);
			});
		}));
	}

	return new Promise(function(resolve, reject) {
		Promise.all(promises).then(function() {
			resolve(mempoolDetails);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getTxOut(txid, vout) {
	return getRpcDataWithParams({method:"gettxout", parameters:[txid, vout]});
}

function getHelp() {
	return getRpcData("help");
}

function getRpcMethodHelp(methodName) {
	return getRpcDataWithParams({method:"help", parameters:[methodName]});
}



function getRpcData(cmd, verifyingConnection=false) {
	let startTime = new Date().getTime();

	if (!verifyingConnection && !global.rpcConnected) {
		return Promise.reject(new Error("No RPC connection available. Check your connection/authentication parameters."));
	}

	return new Promise(function(resolve, reject) {
		debugLog(`RPC: ${cmd}`);

		let rpcCall = async function(callback) {
			let client = (cmd == "gettxoutsetinfo" ? global.rpcClientNoTimeout : global.rpcClient);

			try {
				const rpcResult = await client.request(cmd, []);
				const result = rpcResult.result;

				//console.log(`RPC: request=${cmd}, result=${JSON.stringify(result)}`);

				if (Array.isArray(result) && result.length == 1) {
					let result0 = result[0];
					
					if (result0 && result0.name && result0.name == "RpcError") {
						logStats(cmd, false, new Date().getTime() - startTime, false);

						debugLog("RpcErrorResult-01: " + JSON.stringify(result0));

						throw new Error(`RpcError: type=errorResponse-01`);
					}
				}

				if (result && result.name && result.name == "RpcError") {
					logStats(cmd, false, new Date().getTime() - startTime, false);

					debugLog("RpcErrorResult-02: " + JSON.stringify(result));

					throw new Error(`RpcError: type=errorResponse-02`);
				}

				resolve(result);

				logStats(cmd, false, new Date().getTime() - startTime, true);

				callback();

			} catch (err) {
				err.userData = {request:cmd};

				utils.logError("RpcError-001", err, {request:cmd});

				logStats(cmd, false, new Date().getTime() - startTime, false);

				reject(err);

				callback();
			}
		};
		
		rpcQueue.push({rpcCall:rpcCall});
	});
}

function getRpcDataWithParams(request, verifyingConnection=false) {
	let startTime = new Date().getTime();

	if (!verifyingConnection && !global.rpcConnected) {
		return Promise.reject(new Error("No RPC connection available. Check your connection/authentication parameters."));
	}

	return new Promise(function(resolve, reject) {
		debugLog(`RPC: ${JSON.stringify(request)}`);

		let rpcCall = async function(callback) {
			let client = (request.method == "gettxoutsetinfo" ? global.rpcClientNoTimeout : global.rpcClient);
			
			try {
				const rpcResult = await client.request(request.method, request.parameters);
				const result = rpcResult.result;

				//console.log(`RPC: request=${request}, result=${JSON.stringify(result)}`);

				if (Array.isArray(result) && result.length == 1) {
					let result0 = result[0];

					if (result0 && result0.name && result0.name == "RpcError") {
						logStats(request.method, true, new Date().getTime() - startTime, false);

						debugLog("RpcErrorResult-03: request=" + JSON.stringify(request) + ", result=" + JSON.stringify(result0));

						throw new Error(`RpcError: type=errorResponse-03`);
					}
				}

				if (result && result.name && result.name == "RpcError") {
					logStats(request.method, true, new Date().getTime() - startTime, false);

					debugLog("RpcErrorResult-04: " + JSON.stringify(result));

					throw new Error(`RpcError: type=errorResponse-04`);
				}

				resolve(result);

				logStats(request.method, true, new Date().getTime() - startTime, true);

				callback();

			} catch (err) {
				err.userData = {request:request};

				utils.logError("RpcError-002", err, {request:`${request.method}${request.parameters ? ("(" + JSON.stringify(request.parameters) + ")") : ""}`});

				logStats(request.method, true, new Date().getTime() - startTime, false);

				reject(err);

				callback();
			}
		};
		
		rpcQueue.push({rpcCall:rpcCall});
	});
}

function unsupportedPromise(minRpcVersionNeeded) {
	return new Promise(function(resolve, reject) {
		resolve({success:false, error:"Unsupported", minRpcVersionNeeded:minRpcVersionNeeded});
	});
}

function logStats(cmd, hasParams, dt, success) {
	if (!global.rpcStats[cmd]) {
		global.rpcStats[cmd] = {count:0, withParams:0, time:0, successes:0, failures:0};
	}

	global.rpcStats[cmd].count++;
	global.rpcStats[cmd].time += dt;

	statTracker.trackPerformance(`rpc.${cmd}`, dt);
	statTracker.trackPerformance(`rpc.*`, dt);

	if (hasParams) {
		global.rpcStats[cmd].withParams++;
	}

	if (success) {
		global.rpcStats[cmd].successes++;
		statTracker.trackEvent(`rpc-result.${cmd}.success`);
		statTracker.trackEvent(`rpc-result.*.success`);

	} else {
		global.rpcStats[cmd].failures++;
		statTracker.trackEvent(`rpc-result.${cmd}.failure`);
		statTracker.trackEvent(`rpc-result.*.failure`);
	}
}


module.exports = {
	getRpcData: getRpcData,
	getRpcDataWithParams: getRpcDataWithParams,

	getBlockchainInfo: getBlockchainInfo,
	getDeploymentInfo: getDeploymentInfo,
	getBlockCount: getBlockCount,
	getNetworkInfo: getNetworkInfo,
	getNetTotals: getNetTotals,
	getMempoolInfo: getMempoolInfo,
	getAllMempoolTxids: getAllMempoolTxids,
	getMiningInfo: getMiningInfo,
	getIndexInfo: getIndexInfo,
	getBlockByHeight: getBlockByHeight,
	getBlockByHash: getBlockByHash,
	getRawTransaction: getRawTransaction,
	getUtxo: getUtxo,
	getMempoolTxDetails: getMempoolTxDetails,
	getRawMempool: getRawMempool,
	getUptimeSeconds: getUptimeSeconds,
	getHelp: getHelp,
	getRpcMethodHelp: getRpcMethodHelp,
	getAddress: getAddress,
	getPeerInfo: getPeerInfo,
	getChainTxStats: getChainTxStats,
	getSmartFeeEstimate: getSmartFeeEstimate,
	getUtxoSetSummary: getUtxoSetSummary,
	getNetworkHashrate: getNetworkHashrate,
	getBlockStats: getBlockStats,
	getBlockStatsByHeight: getBlockStatsByHeight,
	getBlockHeaderByHash: getBlockHeaderByHash,
	getBlockHeaderByHeight: getBlockHeaderByHeight,
	getBlockHashByHeight: getBlockHashByHeight,
	getTxOut: getTxOut,
	getBlockTemplate: getBlockTemplate,

	minRpcVersions: minRpcVersions
};