// -- KRW - BTC - ETH - KRW
const WebSocket = require("ws");
const { v4 : uuidv4 } = require("uuid");

const BITHUMB_WS_URL = "wss://ws-api.bithumb.com/websocket/v1";
const bithumbSock = new WebSocket(BITHUMB_WS_URL);

const prices = {
  "KRW-BTC": null,
  "KRW-ETH": null,
  "BTC-ETH": null
};

const codes = ["KRW-BTC", "KRW-ETH", "BTC-ETH"];

bithumbSock.on("open", () => {
	console.log("connected to Bithumb");
	const request = [
		{ ticket: uuidv4() },
		{ type: "ticker", codes, isOnlyRealtime : true },
		{ format: "DEFAULT" }
	];
	bithumbSock.send(JSON.stringify(request));
});

bithumbSock.on("message", msg => {
  try {
    const json = JSON.parse(msg.toString());
    const code = json.code;
    const price = Number(json.trade_price);
    prices[code] = price;
    renderConsole();
  } catch (err) {
    console.error("JSON parse error:", err);
  }
});

function renderConsole() {
	if (Object.values(prices).some(x => x === null)) {
		return;
	}

	console.clear();

	codes.forEach(x => {
		console.log(`${x}: ${prices[x].toLocaleString()}`);
	});

	const start = 1_000_000;
	const btc = start / prices["KRW-BTC"];
	const eth = btc / prices["BTC-ETH"];
	const end = eth * prices["KRW-ETH"];

	const profit = end - start;
	const profitPercent = (profit / start * 100).toFixed(4);
	console.log(`expected: ${profit} KRW | ${profitPercent}%`);
	console.log(`updated at ${new Date().toLocaleTimeString()}`);
}

bithumbSock.on("error", err => console.error("WebSocket Error: ", err));
bithumbSock.on("close", () => console.log("WebSocket connection closed."));