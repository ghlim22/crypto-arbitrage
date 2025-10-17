// -- Bitcoin price
const WebSocket = require("ws");
const { v4 : uuidv4 } = require("uuid");

// -- Read data from Bithumb

const BITHUMB_WS_URL = "wss://ws-api.bithumb.com/websocket/v1";
const bithumbSock = new WebSocket(BITHUMB_WS_URL);

let bithumbPrice = null;

bithumbSock.on("open", () => {
	console.log("connected to Bithumb");
	const request = [
		{ ticket: uuidv4() },
		{ type: "ticker", codes: ["KRW-BTC"], isOnlyRealtime : true },
		{ format: "DEFAULT" }
	];
	bithumbSock.send(JSON.stringify(request));
});

bithumbSock.on("message", (msg) => {
	try {
		const json = JSON.parse(msg.toString());
		bithumbPrice = {
			market: json.code,
			trade_price: json.trade_price,
			trade_time: json.trade_time
		};
		renderConsole();
	} catch (error) {
		console.error("error: ", error);
	}
});

// -- UpBit

const UPBIT_WS_URL = "wss://api.upbit.com/websocket/v1";
const upbitSock = new WebSocket(UPBIT_WS_URL);

let upbitPrice = null;

upbitSock.on("open", () => {
	console.log("connected to UpBit");
	const request = [
		{ ticket: uuidv4() }, // ticket object
		{ type: "ticker", codes: ["KRW-BTC"], is_only_realtime : true }, // data type object
		{ format: "DEFAULT" } // format object
	];
	upbitSock.send(JSON.stringify(request));
});

upbitSock.on("message", (msg) => {
	try {
		const json = JSON.parse(msg.toString());
		upbitPrice = {
			market: json.code,
			trade_price: json.trade_price,
			trade_time: json.trade_time
		};
		renderConsole();
	} catch (error) {
		console.error("error: ", error);
	}
});

upbitSock.on("error", (err) => {
	console.error("error: ", err);
});

upbitSock.on("close", () => {
	console.log("closed!");
});

function renderConsole() {
	if (!bithumbPrice || !upbitPrice) {
		return;
	}

	console.clear();
	console.log("market: BTC/KRW");
	console.log(`Bithumb - trade_price: ${bithumbPrice.trade_price} | trade_time: ${bithumbPrice.trade_time}`);
	console.log(`Upbit - trade_price: ${upbitPrice.trade_price} | trade_time: ${upbitPrice.trade_time}`);

	const diff = bithumbPrice.trade_price - upbitPrice.trade_price;
	const diffPercent = (diff / ((bithumbPrice.trade_price + upbitPrice.trade_price) / 2) * 100).toFixed(2);
	console.log(`spread: ${diff.toLocaleString()} KRW | ${diffPercent} %`);

	console.log(`updated at: ${new Date().toLocaleTimeString()}`);
}

[bithumbSock, upbitSock].forEach((s)=>{
	s.on("error", err => console.error("socket error: ", err));
	s.on("close", () => console.log("websocket connection closed."));
});