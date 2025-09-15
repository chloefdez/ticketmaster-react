import React from "react";
import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import Footer from "./Footer";

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar /> {/* always rendered at the top */}
      <main className="flex-1">
        <Outlet />{" "}
      </main>
      <Footer /> {/* always rendered at the bottom */}
    </div>
  );
};

export default Layout;
