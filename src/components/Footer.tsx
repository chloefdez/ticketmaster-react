import React from "react";
import tmLogo from "../assets/ticketmaster-logo-white.png";

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#121212] text-gray-400 pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {/* About */}
          <div className="mx-auto text-left">
            <h3 className="text-white font-semibold mb-4">About</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div className="mx-auto text-left">
            <h3 className="text-white font-semibold mb-4">Help</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Customer Support
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Accessibility
                </a>
              </li>
            </ul>
          </div>

          {/* Events */}
          <div className="mx-auto text-left">
            <h3 className="text-white font-semibold mb-4">Events</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Concerts
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Sports
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Arts & Theatre
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="mx-auto text-left">
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Terms of Use
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-white cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Demo only — links not functional");
                  }}
                >
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-gray-700 pt-6 flex flex-col md:flex-row items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img
              src={tmLogo}
              alt="Ticketmaster"
              className="h-14 w-auto opacity-90"
            />
          </div>

          {/* Copyright */}
          <p className="text-gray-500 text-sm mt-4 md:mt-0">
            © 2025 Ticketmaster Clone by Chloe Goncalves
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;