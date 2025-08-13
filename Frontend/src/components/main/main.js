import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Scene3D } from '../3dsection/Scene3D';
import '../../style/main.css';
import Navbar from '../navbar';
import itArImage from '../../style/images/it_ar.png';
import personalImage from '../../style/images/ahmed.jpg';
import axios from 'axios'; // Assuming you're using axios for API calls
import { Link } from 'react-router-dom'; // Make sure to import Link if you're using React Router
import moImage from '../../style/images/mo_avatar.jpg';
import { MessageCircle } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import AnimatedStat from "./AnimatedStat"; // Update the path based on your file structure
const Main = () => {
  useEffect(() => {
    const checkTokenValidity = () => {
      const token = localStorage.getItem('token');
      const tokenCreatedAt = localStorage.getItem('tokenCreatedAt');
      
      if (!token || !tokenCreatedAt) {
        localStorage.removeItem('token');
        localStorage.removeItem('tokenCreatedAt');
        return;
      }
  
      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (decodedToken.exp < currentTime) {
          localStorage.removeItem('token');
          localStorage.removeItem('tokenCreatedAt');
          return;
        }
  
        const tokenAge = (Date.now() - parseInt(tokenCreatedAt)) / (1000 * 60 * 60);
        
        if (tokenAge < 24) {
          localStorage.setItem('tokenCreatedAt', Date.now().toString());
        }
      } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('tokenCreatedAt');
      }
    };
  
    checkTokenValidity();
  
    const tokenCheckInterval = setInterval(checkTokenValidity, 30 * 60 * 1000);
  
    return () => clearInterval(tokenCheckInterval);
  }, []);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
    const [statistics, setStatistics] = useState({
      studentCount: 300,
      graduationStudentCount: 24,
      booksCount: 35
    });
  
 


  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await axios.get('http://localhost:8080/statistics');
        const data = response.data; 

        console.log(data); 

        setStatistics({
          studentCount: data.StudentsCount || 300,
          graduationStudentCount: data.graduation_students_count || 24,
          booksCount: data.books_count || 35,
        });
      } catch (error) {
        console.error('Error fetching statistics:', error);
      }
    };

    fetchStatistics();
  }, []);
  

  const sectionVariants = {
    hidden: { opacity: 0, y: 100 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1.2, ease: 'easeInOut' },
    },
  };

  const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  };

  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1.5, ease: 'easeInOut' },
    },
  };

  return (
    <div>
      <Navbar isScrolled={isScrolled} />

      <motion.section
        id="section1"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }} // `once: true` ensures the animation happens only once.
        variants={sectionVariants}
      >
        <div className="square-container">
          <div className="three-d-container">
            <Scene3D />
            <img src={itArImage} className="building-image" alt="شعار كلية" />
          </div>
          <div className="animated-square"></div>
        </div>

        <div className="content">
          <h1>مرحبًا بكم في كلية تقنية المعلومات</h1>
          <p>
            حيث يلتقي الابتكار بالتكنولوجيا، نُعدك لتكون جزءًا من الجيل القادم
            من قادة التكنولوجيا.
          </p>
        </div>
      </motion.section>

      <motion.section
        id="section2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }} // `once: true` ensures the animation happens only once.
        variants={cardContainerVariants}
      >
        <motion.div className="card" variants={cardVariants}>
          <a href="/projects" className="card-link">
            <h3>مشروع التخرج</h3>
            <p>استكشاف مشاريع القسم المصممة لإحداث تأثير.</p>
          </a>
        </motion.div>
        <motion.div className="card" variants={cardVariants}>
          <a href="/teachers" className="card-link">
            <h3>اساتذة القسم</h3>
            <p>تعرف على هيئة التدريس وأهداف التخصص.</p>
          </a>
        </motion.div>
        
        <motion.div className="card" variants={cardVariants}>
          <a href="/postlist" className="card-link">
            <h3>المنشورات</h3>
            <p>اعلانات ومنشورات القسم</p>
          </a>
        </motion.div>
   
      </motion.section>

      <motion.section
        id="section3"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }} // `once: true` ensures the animation happens only once.
        variants={sectionVariants}
      >
        <h2>حول طلابنا</h2>
        <p>
          طلابنا هم مبتكرون ومفكرون مستعدون لمواجهة تحديات الغد باستخدام
          التكنولوجيا.
        </p>
        <motion.div className="highlight-card" variants={cardVariants}>
          <h3>مجتمع طلابي نابض</h3>
          <p className="paragraph">
            نعمل على إنشاء مجتمع يشجع على التعاون والمشاركة في المشاريع التقنية
            الرائدة.
          </p>
        </motion.div>
      </motion.section>

      <motion.section
        id="section4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }} // `once: true` ensures the animation happens only once.
        variants={cardContainerVariants}
      >
<motion.div className="stat-card" variants={cardVariants}>
  <h3>
    <AnimatedStat targetValue={statistics.studentCount || +200} />+
  </h3>
  <p>الطلاب الحاليين</p>
</motion.div>

<motion.div className="stat-card" variants={cardVariants}>
  <h3>
    <AnimatedStat targetValue={statistics.graduationStudentCount || +30} />
  </h3>
  <p>سيتخرجون هذا الفصل</p>
</motion.div>

<motion.div className="stat-card" variants={cardVariants}>
  <h3>
    <AnimatedStat targetValue={statistics.booksCount || +200} />
  </h3>
  <p>الكتب المتاحة</p> {/* Added a label for booksCount */}
</motion.div>
      </motion.section>

{/* Only updating the footer section */}
<motion.footer
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, amount: 0.25 }} // `once: true` ensures the animation happens only once.
  variants={footerVariants}
  className="footer"
>
  <div className="footer-content">
    <div className="footer-grid">
      <div className="team-section">
        <div className="team-member">
          <div className="member-card">
            <img src={moImage} alt="محمد عبدالرسول محمد" className="profile-photo" />
            <h3 className="member-name">محمد عبدالرسول محمد</h3>
            <p className="member-role"></p>
            <div className="social-links">
  <a href="https://t.me/Moh7674" target="_blank" rel="noopener noreferrer" className="social-link">
    <span className="social-icon"><MessageCircle/></span>
  </a>
  <a href="https://www.facebook.com/profile.php?id=100004760019546" target="_blank" rel="noopener noreferrer" className="social-link">
    <span className="social-icon">f</span>
  </a>
</div>
          </div>
          
        </div>

        <div className="team-member">
          <div className="member-card">
          <Link 
  to="/about/contact" 
  className="member-link disabled" // Add a 'disabled' class
>
  <img src={personalImage} alt="أحمد علي عطية" className="profile-photo" />
  <h3 className="member-name">أحمد علي عطية</h3>
</Link>
<p className="member-role">مطور النظام, مختص بتطوير الخوادم والمواقع والتطبيقات ومودلات ذكاء الاصطناعي والانظمه الخبيرة!</p>
<div className="social-links">
  <a href="https://x.com/oG_Jughead" target="_blank" rel="noopener noreferrer" className="social-link">
    <span className="social-icon">𝕏</span>
  </a>
  <a href="https://www.facebook.com/oGJughead" target="_blank" rel="noopener noreferrer" className="social-link">
    <span className="social-icon">f</span>
  </a>
</div>
          </div>
        </div>
      </div>

      <div className="footer-info">
        <div className="contact-section">
          <h4 className="section-title">تواصل معنا</h4>
          <div className="contact-list">
            <a href="mailto:ogjughead@gmail.com" className="contact-item">
              <div className="contact-icon">✉️</div>
              <span className="contact-text">ogjughead@gmail.com</span>
            </a>
            <a href="tel:+218926432250" className="contact-item">
              <div className="contact-icon">📞</div>
              <span className="contact-text">+218 92 643 2250</span>
            </a>
          </div>
        </div>

        <nav className="quick-links">
          <h4 className="section-title">روابط سريعة</h4>
          <ul className="links-list">
            <li><Link to="/projects" className="nav-linkss">المشاريع</Link></li>
            <li><Link to="/PreProjects" className="nav-linkss">مقدمة المشاريع</Link></li>
            <li><Link to="/teachers" className="nav-linkss">المدرسين</Link></li>
            <li><Link to="/postlist" className="nav-linkss">المنشورات</Link></li>
            <li><Link to="/about/department" className="nav-linkss">لوائح القسم</Link></li>
            <li><Link to="/about/contact" className="nav-linkss">حول المبرمج </Link></li>

          </ul>
        </nav>
      </div>
    </div>

    <div className="footer-bottom">
      <p className="copyright">© 2025 كلية تقنية المعلومات. جميع الحقوق محفوظة</p>
    </div>
  </div>
</motion.footer>
    </div>
  );
};

export default Main;