import Image from "next/image";
import { messages } from "@/i18n/messages";

export default function HomePage() {
  const copy = messages.ar;

  return (
    <main className="welcome">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <Image src="/brand-mark.svg" alt="" width={64} height={64} priority />
        <p className="eyebrow">{copy.name}</p>
        <h1 id="welcome-title">{copy.status}</h1>
        <p className="introduction">{copy.introduction}</p>
      </section>
    </main>
  );
}
