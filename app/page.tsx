import Header from "@/app/components/Header";
import Hero from "@/app/components/Hero";
import StrengthsSection from "@/app/components/StrengthsSection";
import QuoteSection from "@/app/components/QuoteSection";
import Footer from "@/app/components/Footer";
import FloatingContactButtons from "@/app/components/FloatingContactButtons";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <StrengthsSection />
        <QuoteSection />
      </main>
      <Footer />
      <FloatingContactButtons />
    </div>
  );
}
