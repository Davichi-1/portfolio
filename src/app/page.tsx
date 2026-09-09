import ChannelStrip from "@/components/ChannelStrip";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Disciplines from "@/components/Disciplines";
import Work from "@/components/Work";
import Process from "@/components/Process";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <ChannelStrip />
      <Nav />

      {/* Left padding clears the fixed channel strip on large screens */}
      <div className="lg:pl-20 xl:pl-24">
        <main className="mx-auto max-w-[1400px]">
          <Hero />
          <Marquee />
          <Disciplines />
          <Work />
          <Process />
          <About />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
