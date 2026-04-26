import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { HomepageEditProvider } from "@/context/HomepageEditContext";

export const PublicLayout = () => (
  <HomepageEditProvider>
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  </HomepageEditProvider>
);
