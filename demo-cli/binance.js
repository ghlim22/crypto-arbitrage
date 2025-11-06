const WebSocket = require('ws');
const { v4 : uuidv4 } = require('uuid');

function binanceConnect() {
	const url = 'wss://stream.binance.com:9443/ws/btcusdt@miniTicker';
	const sock = new WebSocket(url);
	sock.on('open', () => {
	});
	sock.on('message', (msg) => {
		const json = JSON.parse(msg.toString());
		console.log(json);
	});
	sock.on('error', (err) => {
		console.log(err);
	});
	sock.on('close', () => {
		console.log("closed");
	});
}

function krakenConnect() {
	const url = 'wss://ws.kraken.com/v2';
	const sock = new WebSocket(url);
	sock.on('open', () => {
		const req = {
			method: 'subscribe',
			params: {
				channel: 'trade',
				symbol: [
					'BTC/USDT'
				]
			},
		};
		sock.send(JSON.stringify(req));
	});
	sock.on('message', (msg) => {
		console.log(msg.toString());
	})
}

// binanceConnect();
krakenConnect();