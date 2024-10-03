import express from "express";
import dotenv from "dotenv";
import {env} from "./helper";
import bodyParser from "body-parser";
import {getLogger} from "./logger";
import axios from "axios";
import {randomBytes} from "node:crypto";

dotenv.config({
    path: ".env.local"
});
dotenv.config({
    path: ".env"
});

const logger = getLogger();

const PUBLIC_ENDPOINT_PORT = parseInt(env("PUBLIC_ENDPOINT_PORT", "3000"));
const PUBLIC_ENDPOINT_URL = env("PUBLIC_ENDPOINT_URL");
const PRIVATE_ENDPOINT_PORT = parseInt(env("PRIVATE_ENDPOINT_PORT", "3001"));
const TELEGRAM_BOT_TOKEN = env("TELEGRAM_BOT_TOKEN");
const SUB_BOTS = env("SUB_BOTS", "").split(",").filter(url => url);
const STUB_BOT_TOKEN = env("STUB_BOT_TOKEN", "1337008:B4CKSP4CEB4CKSP4CEB4CKSP4CEB4CKSP4C");

const secretToken = randomBytes(32).toString("hex");

const publicEndpoint = express();
publicEndpoint.use(bodyParser.json());

const privateEndpoint = express();

async function sendToAllSubBots(data: object): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const subBotUrl of SUB_BOTS) {
        const responsePromise = (async () => {
            try {
                const response = await axios.post(subBotUrl, data, {
                    responseType: "text"
                });
                if (response.status !== 200) {
                    logger.error(`Subbot '${subBotUrl}' replied with non-200 error: ${response.status} ${response.data}`);
                }
            } catch (e) {
                logger.error(`Failed to send request to subbot '${subBotUrl}': ${e}`);
            }
        })();

        promises.push(responsePromise);
    }

    await Promise.all(promises);
}

publicEndpoint.post("/", (req, res) => {
    res.status(200).end();

    if (req.header("X-Telegram-Bot-Api-Secret-Token") !== secretToken) {
        return;
    }

    const data = req.body as object;
    if (!data) {
        return;
    }

    sendToAllSubBots(data)
        .catch(e => logger.error(`Failed to send to all sub bots: ${e}`));
});

const proxifiedRequestHeaders = [
    "content-type",
    "content-encoding",
    "content-length",
    "transfer-encoding"
];

const proxifiedResponseHeaders = [
    "content-type",
    "content-encoding",
    "content-length",
    "transfer-encoding"
];

privateEndpoint.use(`/bot${STUB_BOT_TOKEN}/:method`, (req, res, next) => {
    const method = req.params.method;
    if (method === "setWebhook") {
        logger.warn("Subbot tried to set webhook")
        res.status(200).json({
            ok: true,
            result: true,
            description: "Webhook was set"
        });
        return;
    }

    const fullUrl = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`);
    for (const [key, value] of Object.entries(req.query)) {
        fullUrl.searchParams.set(key, String(value));
    }

    const requestHeaders: Record<string, string> = {};
    for (const header of proxifiedRequestHeaders) {
        if (!req.headers[header]) {
            continue;
        }
        requestHeaders[header] = String(req.headers[header]);
    }

    axios.request({
        url: fullUrl.toString(),
        method: req.method,
        data: req,
        responseType: "stream",
        headers: requestHeaders,
        validateStatus: () => true
    }).then(response => {
        res.status(response.status);
        for (const header of proxifiedResponseHeaders) {
            if (response.headers[header]) {
                res.header(header, response.headers[header]);
            }
        }
        const dataStream = response.data;
        dataStream.pipe(res);
    }).catch(e => {
        next(e);
    });
});

(async () => {
    logger.info(`Starting, registering global webhook at '${PUBLIC_ENDPOINT_URL}' with secret_token: ${secretToken}`);

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
        url: PUBLIC_ENDPOINT_URL,
        secret_token: secretToken
    });

    publicEndpoint.listen(PUBLIC_ENDPOINT_PORT, () => {
        logger.info(`Public endpoint listening on :${PUBLIC_ENDPOINT_PORT}`);
    });
    privateEndpoint.listen(PRIVATE_ENDPOINT_PORT, () => {
        logger.info(`Private endpoint listening on :${PRIVATE_ENDPOINT_PORT}`);
    });
})().catch(console.error);

