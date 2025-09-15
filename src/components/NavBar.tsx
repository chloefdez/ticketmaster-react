import React from "react";
import logo from "../assets/ticketmaster-logo-white.png";

const NavBar: React.FC = () => {
  return (
    <nav className="bg-[#0266df] text-white sticky top-0 z-40 shadow-none !px-10 lg:!px-16">
      {/* outer flex row splits left vs right */}
      <div className="h-16 w-full flex items-center justify-between">
        {/* LEFT: Logo + Categories */}
        <div className="flex items-center gap-10">
          <a href="/" className="flex items-center">
            <img
              src={logo}
              alt="Ticketmaster"
              className="h-14 md:h-16 w-auto"
            />
          </a>

          <ul className="hidden md:flex items-center gap-2">
            <li>
              <a
                href="#"
                className="block h-16 min-w-[120px] px-6 flex items-center justify-center text-center font-semibold opacity-95 hover:opacity-100 transition-colors duration-150 hover:bg-[#0156cd]"
              >
                Concerts
              </a>
            </li>
            <li>
              <a
                href="#"
                className="block h-16 min-w-[120px] px-6 flex items-center justify-center text-center font-semibold opacity-95 hover:opacity-100 transition-colors duration-150 hover:bg-[#0156cd]"
              >
                Sports
              </a>
            </li>
            <li>
              <a
                href="#"
                className="block h-16 min-w-[120px] px-6 flex items-center justify-center text-center font-semibold opacity-95 hover:opacity-100 transition-colors duration-150 hover:bg-[#0156cd]"
              >
                Arts &amp; Theater
              </a>
            </li>
          </ul>
        </div>

        {/* RIGHT: Sign In / Register */}
        <a
          href="#"
          className="block h-16 px-12 flex items-center font-semibold transition-colors duration-150 hover:bg-[#0156cd]"
        >
          <i
            className="fa-solid fa-circle-user text-lg mr-2"
            aria-hidden="true"
          ></i>
          <span className="hidden sm:inline">Sign In / Register</span>
        </a>
      </div>
    </nav>
  );
};

export default NavBar;
