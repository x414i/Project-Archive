import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../style/navbar.css';
import '../style/dropdown.css';
import '../style/animations.css';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Scene3D } from './3dsection/Scene3D';
import {jwtDecode} from 'jwt-decode'; // Ensure you import jwtDecode correctly

const Navbar = ({ isScrolled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGraduated, setIsGraduated] = useState(false);

  const navigate = useNavigate();

  const initializeUserState = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setIsAdmin(decodedToken.user_role?.includes('admin'));
        setIsGraduated(decodedToken.user_role?.includes("graduated_student"))
        setIsSignedIn(true); // User is signed in if token exists
      } catch (error) {
        console.error('Error decoding token:', error);
        setIsSignedIn(false);
      }
    } else {
      setIsSignedIn(false);
    }
  };

  useEffect(() => {
    initializeUserState();
  }, []); // Empty dependency ensures it runs only once.

  const toggleNavbar = () => {
    setIsOpen(!isOpen);
  };

  const toggleAbout = () => {
    setIsAboutOpen(!isAboutOpen);
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('credentials');
    setIsSignedIn(false);
    setIsAdmin(false); // Reset admin state on sign out
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isAboutOpen && !event.target.closest('.dropdown')) {
        setIsAboutOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isAboutOpen]);

  const handleDropdownItemClick = () => {
    setIsOpen(false); // Close the navbar
    setIsAboutOpen(false); // Optionally close the dropdown
  };

  return (
    <nav id="navbar" className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navbar-left">
        <div className="scene3d-container">
          <Scene3D />
        </div>
        <div className="logo">
          <Link to="/" className="link-as-text">
            تقنية معلومات المرج
          </Link>
        </div>
      </div>

      <button className="toggle-button" onClick={toggleNavbar} aria-label="Toggle navigation">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <ul className={`nav-links ${isOpen ? 'open' : ''}`}>
        <li className="nav-item">
          <Link to="/" className="nav-link">الرئيسية</Link>
        </li>
        <li className="nav-item dropdown">
          <button 
            className={`dropdown-button ${isAboutOpen ? 'active' : ''}`} 
            onClick={toggleAbout}
            aria-expanded={isAboutOpen}
          >
            حول 
            <ChevronDown 
              size={16} 
              className={`arrow ${isAboutOpen ? 'rotated' : ''}`}
            />
          </button>
          <ul className={`dropdown-menu ${isAboutOpen ? 'show' : ''}`}>
            <li><Link to="/about/department" className="dropdown-item" onClick={handleDropdownItemClick}>لوائح القسم</Link></li>
            <li><Link to="/teachers" className="dropdown-item" onClick={handleDropdownItemClick}>أعضاء هيئة التدريس </Link></li>
            <li><Link to="/about/contact" className="dropdown-item" onClick={handleDropdownItemClick }>حول المبرمج</Link></li>
          </ul>
        </li>
        <li className="nav-item">
          <Link to="/postlist" className="nav-link">المنشورات</Link>
        </li>
        <li className="nav-item">
          <Link to="/preprojects" className="nav-link">المشاريع القادمة</Link>
        </li>
        <li className="nav-item">
          <Link to="/projects" className="nav-link">المشاريع</Link>
        </li>
        {isSignedIn && (
          <>
          {!isGraduated &&(
            <li className="nav-item">
              <Link to="/chat" className="nav-link">المحادثات</Link>
            </li>
          )}
            <li className="nav-item">
              <Link to="/profile" className="nav-link">الحساب الشخصي</Link>
            </li>
            {isAdmin && (
              <li className="nav-item">
                <Link to="/users" className="nav-link">المستخدمين</Link>
              </li>
            )}
          </>
        )}
        <li className="nav-item auth-item">
          {isSignedIn ? (
            <a href="/" onClick={handleSignOut} className="nav-link auth-link">
              تسجيل خروج
            </a>
          ) : (
            <Link to="/login" className="nav-link auth-link">
              تسجيل دخول
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;