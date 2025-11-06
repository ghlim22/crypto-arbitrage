const WebSocket = require('ws');
const { v4 : uuidv4 } = require('uuid');

let bithumbPrice = null;
let upbitPrice = null;
let binancePrice = null;
let krakenPrice = null;
let okxPrice = null;

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
		renderConsole();
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
		renderConsole();
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
		renderConsole();
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
		renderConsole();
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
			renderConsole();
		}
	});
	sock.on('error', (err) => {
		sock.close();
	});
	sock.on('close', () => {
		reconnect(okxConnect);
	});	
}

function renderConsole() {
	if (!bithumbPrice || !upbitPrice || !binancePrice || !krakenPrice || !okxPrice) {
		return;
	}

	console.clear();
	console.log(`Bithumb: besk ask: ${bithumbPrice.best_ask_price} | best bid: ${bithumbPrice.best_bid_price} timestamp: ${bithumbPrice.timestamp}`);
	console.log(`Upbit: best ask: ${upbitPrice.best_ask_price} | best bid: ${upbitPrice.best_bid_price} | timestamp: ${upbitPrice.timestamp}`);
	console.log(`Binance: best ask: ${binancePrice.best_ask_price} | best bid: ${binancePrice.best_bid_price}`);
	console.log(`Kraken: besk ask: ${krakenPrice.best_ask_price} | best bid: ${krakenPrice.best_bid_price}`);
	console.log(`OKX: besk ask: ${okxPrice.best_ask_price} | best bid: ${okxPrice.best_bid_price}`);
}

function main() {
	bithumbConnect();
	upbitConnect();
	binanceConnect();
	krakenConnect();
	okxConnect();
}

main();