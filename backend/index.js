import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = express();
const FRONTEND_ORIGIN = "http://localhost:5173";

const evmAddress = "0xfd394a2fb4da8edd7151b57cd26438bfca80dbbe";
const svmAddress = "8p8aMikhb4mMhk8UP2YdmcSxAbuzkeiyWMzU49zTAcaK";

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,PAYMENT,PAYMENT-SIGNATURE,X-PAYMENT-SIGNATURE",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "PAYMENT-REQUIRED,X-PAYMENT-REQUIRED,PAYMENT-RESPONSE,X-PAYMENT-RESPONSE",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(
  paymentMiddleware(
    {
      "GET /weather": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "eip155:84532",
            payTo: evmAddress,
          },
          {
            scheme: "exact",
            price: "$0.001",
            network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
            payTo: svmAddress,
          },
        ],
        description: "Weather data",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient)
      .register("eip155:84532", new ExactEvmScheme())
      .register(
        "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        new ExactSvmScheme(),
      ),
  ),
);

app.get("/weather", (req, res) => {
  res.send({
    report: {
      weather: "Sunny",
      temp: 70,
    },
  });
});

app.listen(8080, () => {
  console.log("Server listening on port 8080");
});
