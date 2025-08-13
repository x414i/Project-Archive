import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/navbar';
import Layout from './components/layout.tsx';
import Main from './components/main/main.js';
import ProjectList from './components/projectsection/projectlist.js';
import ProjectDetail from './components/projectsection/projectdetails.js';
import PreProjectList from './components/preprojectsection/PreProjects.js';
import PreProjectDetail from './components/preprojectsection/PreProjectsDetails.js';
import PostsList from './components/postsection/postlist.js';
import Login from './components/loginsection/login.js';
import Teachers from './components/teacherssection/teachers.js';
import Profile from './components/profilesection/profile.js';
import Chat from './components/chatsection/chat.js';
import AboutProgrammer from './components/aboutprogramms/aboutprogramers.tsx';
import Users from './components/users/users.js';
import Usersdetails from './components/users/userdetails.js';
import AboutCollege from './components/AboutCollege.js';
import Signup from './components/loginsection/signup.js';
import VerifyEmail from './components/loginsection/verification.js';
import RequestResetPassword from './components/loginsection/requestpassword.js';
import ResetPassword from './components/loginsection/resetpassword.js';
import VerifyResetCode from './components/loginsection/verifyresetcode.js';

function App() {
  const location = useLocation();
  const isPublicRoute = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify-reset-code' 
  || location.pathname === '/verify-email' || location.pathname === '/request-reset-password' || location.pathname === '/reset-password';

  return (
    <>
      {!isPublicRoute && <Navbar />}
      <Layout>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/login" element={<Login />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-reset-code" element={<VerifyResetCode />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/request-reset-password" element={<RequestResetPassword />} />

          <Route path="/preprojects" element={<PreProjectList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/preprojects/:id" element={<PreProjectDetail />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/postlist" element={<PostsList />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users" element={<Users/>} />
          <Route path="/users/:id" element={<Usersdetails/>} />
          <Route path="/about/department" element={<AboutCollege/>} />

          <Route path="/about/contact" element={<AboutProgrammer />} />
        </Routes>
      </Layout>
    </>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;