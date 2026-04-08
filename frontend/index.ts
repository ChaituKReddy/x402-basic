import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPayment, x402Client, x402HTTPClient } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

console.log("Connected address: ", signer.address);

const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(signer));

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const response = await fetchWithPayment("http://localhost:8080/weather", {
  method: "GET",
});

try {
  const response = await fetchWithPayment("http://localhost:8080/weather", {
    method: "GET",
  });

  const data = await response.json();
  console.log("Response is ", data);

  if (response.ok) {
    const httpClient = new x402HTTPClient(client);
    const paymentResponse = httpClient.getPaymentSettleResponse((name) =>
      response.headers.get(name),
    );
    console.log("Payment settled", paymentResponse);
  }
} catch (error) {
  if (error.message.includes("No scheme registered")) {
    console.error("Network not supported - register the appropriate scheme");
  } else if (error.message.includes("Payment already attempted")) {
    console.error("Payment failed on retry");
  } else {
    console.error("Request failed:", error);
  }
}
