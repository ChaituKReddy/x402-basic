import { useMemo, useState } from "react";
import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wrapAxiosWithPayment, x402Client, x402HTTPClient } from "@x402/axios";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { useAccount, useDisconnect, useWalletClient, WagmiProvider } from "wagmi";
import { config } from "./config";
import { WalletOptions } from "./walletOptions";

const queryClient = new QueryClient();
const WEATHER_ENDPOINT = import.meta.env.VITE_WEATHER_ENDPOINT ?? "/api/weather";

type WeatherResponse = {
  report: {
    weather: string;
    temp: number;
  };
};

function WeatherApp() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();

  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequiredInfo, setPaymentRequiredInfo] = useState<Record<string, unknown> | null>(null);

  const api = useMemo(() => {
    if (!walletClient) {
      return null;
    }

    const signer = toClientEvmSigner({
      address: walletClient.account.address,
      signTypedData: (message) => {
        const args = {
          account: walletClient.account,
          ...message,
        } as Parameters<typeof walletClient.signTypedData>[0];

        return walletClient.signTypedData(args);
      },
    });

    const client = new x402Client().register("eip155:*", new ExactEvmScheme(signer));
    const httpClient = new x402HTTPClient(client).onPaymentRequired(async ({ paymentRequired }) => {
      setPaymentRequiredInfo(paymentRequired as Record<string, unknown>);
    });

    return wrapAxiosWithPayment(axios.create(), httpClient);
  }, [walletClient]);

  const fetchWeather = async () => {
    if (!api) {
      setError("Connect a wallet first to pay for the weather endpoint.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPaymentRequiredInfo(null);

    try {
      const response = await api.get<WeatherResponse>(WEATHER_ENDPOINT);
      setWeather(response.data);
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 402) {
        const paymentRequiredHeader =
          requestError.response.headers["payment-required"] ??
          requestError.response.headers["x-payment-required"];

        if (typeof paymentRequiredHeader === "string") {
          try {
            const decoded = decodePaymentRequiredHeader(paymentRequiredHeader);
            setPaymentRequiredInfo(decoded as Record<string, unknown>);
          } catch {
            // Ignore header parse errors and show generic 402 guidance below.
          }
        }

        setError("Payment required (402). Approve payment in your wallet and retry.");
      } else {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Weather request failed.";
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "min(640px, 100%)",
          display: "grid",
          gap: "0.75rem",
        }}
      >
        <h1>x402 Weather Demo</h1>

        {!isConnected ? (
          <WalletOptions />
        ) : (
          <>
            <p>Connected: {address}</p>
            <button onClick={() => disconnect()}>Disconnect</button>
          </>
        )}

        <button disabled={!api || isLoading} onClick={fetchWeather}>
          {isLoading ? "Loading..." : "Get Weather"}
        </button>

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        {paymentRequiredInfo && (
          <pre
            style={{
              margin: 0,
              padding: "0.75rem",
              border: "1px solid #f1c40f",
              borderRadius: "8px",
              background: "#fff9e6",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(paymentRequiredInfo, null, 2)}
          </pre>
        )}

        {weather && (
          <pre
            style={{
              margin: 0,
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(weather, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}

const App = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WeatherApp />
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
