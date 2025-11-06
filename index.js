const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const { v4 : uuidv4 } = require('uuid');

let bithumbPrice = null;
let upbitPrice = null;
let binancePrice = null;
let krakenPrice = null;
let okxPrice = null;

const prices = {
	bithumb: null,
	upbit: null,
	binance: null,
	kraken: null,
	okx: null
};

function reconnect(conn) {
	const timeout = 5000;
	setTimeout(conn, timeout);
}

function bithumbConnect() {
	const url = 'wss://ws-api.bithumb.com/websocket/v1';
	const sock = new WebSocket(url);
	sock.on('open', () => {
		const req = [
			{ ticket : uuidv4() },
			{ type: 'orderbook', codes: ['USDT-BTC']},
			{ format: 'DEFAULT'}
		];
		sock.send(JSON.stringify(req));
	});
	sock.on('message', (msg) => {
		const json = JSON.parse(msg.toString());
		bithumbPrice = {
			market: json.code,
			best_ask_price: json.orderbook_units[0].ask_price,	
			best_bid_price: json.orderbook_units[0].bid_price,
			timestamp: json.timestamp
		};
		render();
	});
	sock.on('error', (error) => {
		sock.close();
	});
	sock.on('close', () => {
		reconnect(bithumbConnect);
	});
}

function upbitConnect() {
	const url = "wss://api.upbit.com/websocket/v1";
	const sock = new WebSocket(url);
	sock.on('open', () => {
		const req = [
			{ ticket: uuidv4() },
			{ type: 'orderbook', codes: ['USDT-BTC.1'] },
			{ format: 'DEFAULT' }
		];
		sock.send(JSON.stringify(req));
	});
	sock.on('message', (msg) => {
		const json = JSON.parse(msg.toString());
		upbitPrice = {
			market: json.code,
			best_ask_price: json.orderbook_units[0].ask_price,
			best_bid_price: json.orderbook_units[0].bid_price,
			timestamp: json.timestamp
		};
		render();
	});
	sock.on('error', (error) => {
		sock.close();
	});
	sock.on('close', () => {
		reconnect(upbitConnect);
	});
}

function binanceConnect() {
	const url = 'wss://stream.binance.com:9443/ws/btcusdt@bookTicker';
	const sock = new WebSocket(url);
	sock.on('message', (msg) => {
		const json = JSON.parse(msg);
		binancePrice = {
			market: json.s,
			best_bid_price: json.b,
			best_ask_price: json.a,
		};
		render();
	});
	sock.on('error', (err) => {
		sock.close();
	});
	sock.on('close', () => {
		reconnect(binanceConnect);
	});
}

function krakenConnect() {
	const url = 'wss://ws.kraken.com/v2';
	const sock = new WebSocket(url);
	sock.on('open', () => {
		const req = {
			method: 'subscribe',
			params: {
				channel: 'ticker',
				symbol: [
					'BTC/USDT'
				],
				event_trigger: "bbo"
			}
		};
		sock.send(JSON.stringify(req));
	});
	sock.on('message', (msg) => {
		const json = JSON.parse(msg.toString());
		if (json.channel == 'ticker') {
			const item = json.data[0];
			krakenPrice = {
				best_ask_price: item.ask,
				best_bid_price: item.bid,
				price: item.last,
				symbol: item.symbol
			};
		}
		render();
	});
	sock.on('error', (err) => {
		sock.close();
	});
	sock.on('close', () => {
		reconnect(okxConnect);
	});	
}

function okxConnect() {
	const url = `wss://ws.okx.com:8443/ws/v5/public`;
	const sock = new WebSocket(url);
	sock.on('open', () => {
		const req = {
			op: 'subscribe',
			args: [
				{
					channel: "bbo-tbt",
					instId: "BTC-USDT"
				}
			]
		};
		sock.send(JSON.stringify(req));
	});
	sock.on('message', (msg) => {
		const json = JSON.parse(msg.toString());
		if ('data' in json) {
			okxPrice = {
				best_ask_price: json.data[0].asks[0][0],
				best_bid_price: json.data[0].bids[0][0],
				timestamp: json.data[0].ts
			};
			render();
		}
	});
	sock.on('error', (err) => {
		sock.close();
	});
	sock.on('close', () => {
		reconnect(okxConnect);
	});	
}

function render() {
	if (!bithumbPrice || !upbitPrice || !binancePrice || !krakenPrice || !okxPrice) {
		return;
	}

	prices.bithumb = bithumbPrice;
	prices.upbit = upbitPrice;
	prices.binance = binancePrice;
	prices.kraken = krakenPrice;
	prices.okx = okxPrice;

	console.clear();
	// console.log(`Bithumb: besk ask: ${bithumbPrice.best_ask_price} | best bid: ${bithumbPrice.best_bid_price} timestamp: ${bithumbPrice.timestamp}`);
	// console.log(`Upbit: best ask: ${upbitPrice.best_ask_price} | best bid: ${upbitPrice.best_bid_price} | timestamp: ${upbitPrice.timestamp}`);
	// console.log(`Binance: best ask: ${binancePrice.best_ask_price} | best bid: ${binancePrice.best_bid_price}`);
	// console.log(`Kraken: besk ask: ${krakenPrice.best_ask_price} | best bid: ${krakenPrice.best_bid_price}`);
	// console.log(`OKX: besk ask: ${okxPrice.best_ask_price} | best bid: ${okxPrice.best_bid_price}`);

	console.log("=== BTC to USDT ===");
	for (const [name, p] of Object.entries(prices)) {
		console.log(`${name.padEnd(8)} |  best ask: ${p.best_ask_price} | best bid: ${p.best_bid_price}`);
	}

	const best = detectArbitrage(prices);

	if (best) {
		console.log(`\n Arbitrage Opportunity Found!`);
    	console.log(`Buy from ${best.buyExchange} at ${best.buyPrice}`);
    	console.log(`Sell to ${best.sellExchange} at ${best.sellPrice}`);
    	console.log(`Spread: ${best.spread}(${best.percent}%)`);

		io.emit('best_arbitrage', best);
	}

	io.emit('prices', prices);

	const graph = buildArbitrageGraph(prices);
	io.emit('graph', graph);
}

function detectArbitrage(prices) {
	const exchanges = Object.keys(prices);
	let best = null;

	for (let i = 0; i < exchanges.length; ++i) {
		for (let j = 0; j < exchanges.length; ++j) {

			const buyExchange = exchanges[i];
			const sellExchange = exchanges[j];
			const buy = prices[buyExchange];
			const sell = prices[sellExchange];
			if (!buy || !sell) {
				continue;
			}

			const buyPrice = parseFloat(buy.best_ask_price);
			const sellPrice = parseFloat(sell.best_bid_price);
			if (sellPrice > buyPrice) {
				const spread = sellPrice - buyPrice;
				const percent = (spread / buyPrice * 100).toFixed(3);
				if (!best || best.spread < spread) {
					best = {
						spread: spread,
						percent: percent,
						buyPrice: buy.best_ask_price,
						sellPrice: sell.best_bid_price,
						buyExchange: buyExchange,
						sellExchange: sellExchange
					};
				}
			}
		}
	}

	return best;
}

function buildArbitrageGraph(prices) {
	const graph = {
		nodes: [],
		edges: []
	};

	for (const exchange in prices) {
		const p = prices[exchange];
		if (!p) {
			continue;
		}
		graph.nodes.push(
			{ id: `${exchange}_ask`, label: `${exchange} ask`, price: parseFloat(p.best_ask_price), type: 'ask'},
			{ id: `${exchange}_bid`, label: `${exchange} bid`, price: parseFloat(p.best_bid_price), type: 'bid'},
		);
	}

	const exchanges = Object.keys(prices);
	for (let i = 0; i < exchanges.length; ++i) {
		for (let j = 0; j < exchanges.length; ++j) {
			if (i == j) {
				continue;
			}

			const buyExchange = exchanges[i];
			const sellExchange = exchanges[j];
			const buy = prices[buyExchange];
			const sell = prices[sellExchange];
			if (!buy || !sell) {
				continue;
			}

			const buyPrice = parseFloat(buy.best_ask_price);
			const sellPrice = parseFloat(sell.best_bid_price);
			if (sellPrice > buyPrice) {
				const spread = sellPrice - buyPrice;
				const percent = (spread / buyPrice * 100).toFixed(3);
				graph.edges.push({
					from: `${buyExchange}_ask`,
					to: `${sellExchange}_bid`,
					label: `${percent}%`,
					weight: percent
				});
			}
		}
	}
	
	return graph;
}

function main() {

	bithumbConnect();
	upbitConnect();
	binanceConnect();
	krakenConnect();
	okxConnect();
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: '*'
	}
});

const port = 3000;
server.listen(port, () => {
	console.log(`listening on port ${port}`);
});
app.use(express.static('public'));

main();