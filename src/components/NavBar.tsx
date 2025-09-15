import React from "react";
import logo from "../assets/ticketmaster-logo-white.png";
import { Link, useSearchParams } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react";

const NavBar: React.FC = () => {
  const [sp] = useSearchParams();
  const makeCatUrl = (cat: string) => {
    const params = new URLSearchParams(sp);
    if (cat) params.set("cat", cat);
    else params.delete("cat");
    params.set("page", "0");
    return `/search?${params.toString()}`;
  };

  return (
    <nav className="bg-[#0266df] text-white sticky top-0 z-40 shadow-none !px-10 lg:!px-16">
      <div className="h-16 w-full flex items-center justify-between">
        {/* LEFT: Logo + Categories */}
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center">
            <img
              src={logo}
              alt="Ticketmaster"
              className="h-14 md:h-16 w-auto"
            />
          </Link>

          <ul className="hidden md:flex items-center gap-2">
            <li>
              <Link
                to={makeCatUrl("music")}
                className="block h-16 min-w-[120px] px-6 flex items-center justify-center text-center font-semibold opacity-95 hover:opacity-100 transition-colors duration-150 hover:bg-[#0156cd]"
              >
                Concerts
              </Link>
            </li>
            <li>
              <Link
                to={makeCatUrl("sports")}
                className="block h-16 min-w-[120px] px-6 flex items-center justify-center text-center font-semibold opacity-95 hover:opacity-100 transition-colors duration-150 hover:bg-[#0156cd]"
              >
                Sports
              </Link>
            </li>
            <li>
              <Link
                to={makeCatUrl("arts")}
                className="block h-16 min-w-[120px] px-6 flex items-center justify-center text-center font-semibold opacity-95 hover:opacity-100 transition-colors duration-150 hover:bg-[#0156cd]"
              >
                Arts &amp; Theater
              </Link>
            </li>
          </ul>
        </div>

        {/* RIGHT: Auth (Clerk) */}
        <div className="flex items-center">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="h-16 px-12 flex items-center font-semibold transition-colors duration-150 hover:bg-[#0156cd]">
                <i
                  className="fa-solid fa-circle-user text-lg mr-2"
                  aria-hidden="true"
                ></i>
                <span className="hidden sm:inline">Sign In / Register</span>
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
