import { Greeting } from "@abacusflow/ui";

export default function Page() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Web App</h1>
      <p>This component is imported from the shared `ui` package:</p>
      <Greeting />
    </main>
  );
}
