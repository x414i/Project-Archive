import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AddProjectForm from './Add_EDIT_ProjectForms/addprojectoform';
import '../../style/ProjectList.css';
import { jwtDecode } from 'jwt-decode';
const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(() => {
    return parseInt(localStorage.getItem('ProjectsPage'), 12) || 1;
  });
  const [perPage] = useState(12);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddForm, setShowAddForm] = useState(false);
  const [meta, setMeta] = useState({});
const [loading,setLoading]=useState(false);
const [isAdmin,setIsAdmin]=useState(false);
const [wasSearching, setWasSearching] = useState(false);
const [previousPage, setPreviousPage] = useState({
  page: 1,
  shouldRestore: false
});

const checkUserRole = () => {
  const token = localStorage.getItem("token");
  if (token) {
    const decodedToken = jwtDecode(token);
    setIsAdmin(decodedToken.user_role && decodedToken.user_role.includes("admin"));
  }
}
useEffect(() => {
  checkUserRole(); // Check user role on component mount
}, []);


const fetchProjects = useCallback(() => {
  setLoading(true);
  const query = searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : '';
  fetch(
    `http://localhost:8080/book?page=${page}&per_page=${perPage}&sort=${
      sortOrder === 'asc' ? '' : '-'
    }${sortField}${query}`
  )
    .then((response) => response.json())
    .then((data) => {
      const books = data.books.map((book) => ({
        id: book.id,
        name: book.name,
        description: book.description,
      }));
    
      const uniqueBooks = Array.from(
        new Map(books.map((book) => [book.id, book])).values()
      );
    
      setProjects(uniqueBooks);
      setMeta(data.meta || {});
    
      // Handle page correction from API
      if (data.meta?.current_page && data.meta.current_page !== page) {
        setPage(data.meta.current_page);
      }
    })
    .catch((error) => {
      console.error('Error fetching books:', error);
    })
    .finally(() => {
      setLoading(false);
    });
}, [page, perPage, sortOrder, sortField, searchTerm]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const sections = document.querySelectorAll('section');
    const options = { threshold: 0.25 };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, options);

    sections.forEach(section => observer.observe(section));

    const navbar = document.getElementById('navbar');
    const handleScroll = () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);


  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  
    if (value) {
      // Entering search: save current page and set wasSearching
      if (!wasSearching) {
        setPreviousPage(page);
        setWasSearching(true);
      }
      setPage(1);
    } else {
      // Clearing search: revert to previous page if wasSearching
      if (wasSearching) {
        setPage(previousPage);
        setWasSearching(false);
      }
    }
  };
  useEffect(() => {
    localStorage.setItem('ProjectsPage', page);
  }, [page]);

  const handleAddButtonClick = () => setShowAddForm(true);

  const handleSortChange = (e) => {
    const [field, order] = e.target.value.split('|');
    setSortField(field);
    setSortOrder(order);
  };

  // Manage pagination
  const goToNextPage = () => {
    if (meta.current_page < meta.last_page) setPage(page + 1);
  };

  const goToPreviousPage = () => {
    if (meta.current_page > meta.first_page) setPage(page - 1);
  };

  const renderPageNumbers = () => {
    const totalPages = meta.last_page || 1;
    const currentPage = meta.current_page || 1;
    const pageNumbers = [];

    // Adaptive visible pages based on screen width
    const maxVisiblePages = window.innerWidth < 600 ? 3 : 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start page if we're near the end
    if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          className={`pagination-btn ${i === currentPage ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    return pageNumbers;
  };
  return (
    <div id="project-list-container">
            <h1>مشاريع التخرج</h1>

          {isAdmin && (
        <button onClick={handleAddButtonClick} className="add-project-btn">إضافة مشروع</button>
      )}


      <div className="controls">
        <input
          type="text"
          placeholder="ابحث عن المشاريع..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-input"
        />

        <select onChange={handleSortChange} value={`${sortField}|${sortOrder}`} className="sort-select">
          <option value="name|asc">ترتيب حسب الاسم من أ الى ي</option>
          <option value="name|desc">ترتيب حسب الاسم من ي الى أ</option>
          <option value="created_at|asc">ترتيب حسب تاريخ الإنشاء من الأقدم إلى الأحدث</option>
          <option value="created_at|desc">ترتيب حسب تاريخ الإنشاء من الأحدث إلى الأقدم</option>
        </select>
      </div>
      {loading ? (
    <div className="loading-state">
    <div className="spinner"></div>
    <p>جاري تحميل مشاريع القسم ...</p>
  </div>      ) :(
      <ul className="project-list">
  {projects.length > 0 ? (
    projects.map((project, index) => (
<li key={project.id} className="project-item">
          <Link to={`/Projects/${project.id}`}>
          <h3 className="project-name">{project.name}</h3>
          <p className="project-description">{project.description}</p>
        </Link>
      </li>
    ))
  ) : (
    <h1 className="no-projects">لا يوجد مشاريع</h1>
  )}
</ul>
  )}
  <div className="pagination-container">
        <div className="pagination">
          {/* First Page Button */}
          {meta.current_page > 1 && (
            <button 
              onClick={() => setPage(1)} 
              className="pagination-btn"
            >
              الأول
            </button>
          )}

          {/* Previous Page Button */}
          <button
            onClick={goToPreviousPage}
            disabled={meta.current_page === 1}
            className="pagination-btn"
          >
            <i className="fas fa-angle-right"></i>
            </button>

          {/* Page Numbers */}
          {renderPageNumbers()}

          {/* Next Page Button */}
          <button
            onClick={goToNextPage}
            disabled={meta.current_page === meta.last_page}
            className="pagination-btn"
          >
                        <i className="fas fa-angle-left"></i>

          </button>

          {/* Last Page Button */}
          {meta.current_page < meta.last_page && (
            <button 
              onClick={() => setPage(meta.last_page)} 
              className="pagination-btn"
            >
              الأخير
            </button>
          )}
        </div>
        <div className="pagination-info">
          الصفحة {meta.current_page} من {meta.last_page}
        </div>
      </div>


      {showAddForm && (
        <div className="overlay">
          <AddProjectForm closeForm={() => setShowAddForm(false)} refreshProjects={fetchProjects} />
        </div>
      )}
    </div>
  );
};

export default ProjectList;