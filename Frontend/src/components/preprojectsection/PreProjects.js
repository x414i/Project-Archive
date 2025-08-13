import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AddProjectForm from './addpreprojectform'; // Assuming this form works for both projects and pre-projects
import '../../style/ProjectList.css';
import {jwtDecode} from 'jwt-decode';

const PreProjects = () => {
  const [preProjects, setPreProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(() => {
    return parseInt(localStorage.getItem('preProjectsPage'), 10) || 1;
  });
  const [perPage] = useState(12);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showAddForm, setShowAddForm] = useState(false);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  
  // New state to control the add button visibility.
  const [canAddPreProject, setCanAddPreProject] = useState(false);
  const [userAssociatedProjects, setUserAssociatedProjects] = useState([]);
  
  const [wasSearching, setWasSearching] = useState(false);
  const [previousPage, setPreviousPage] = useState({
    page: 1,
    shouldRestore: false
  });
  
  // Also keep the form data for the AddProjectForm.
  // (Assuming the AddProjectForm uses its own internal logic for auto-adding student emails.)
  // Here we only decide whether to show the Add button.
  
  useEffect(() => {
    const checkUserRole = () => {
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          const roles = decodedToken.user_role; // Expecting roles as an array
          
          // Set canAddPreProject if the user has any of these roles.
          if (Array.isArray(roles)) {
            const isGraduation = roles.includes("graduation_student");
            const isAdmin = roles.includes("admin");
            const isTeacher = roles.includes("teacher");
            setCanAddPreProject(isGraduation || isAdmin || isTeacher);
            
            if (decodedToken.id && (isGraduation || isTeacher)) {
              fetch(`http://localhost:8080/preproject/associated?id=${decodedToken.id}`)
                .then(response => response.json())
                .then(data => setUserAssociatedProjects(data.pre_projects || []))
                .catch(console.error);
                
            }
          }
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    };
    checkUserRole();
  }, [token]);
  
  const fetchPreProjects = useCallback(() => {
    setLoading(true);
    const query = searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : '';
    fetch(`http://localhost:8080/preproject?page=${page}&per_page=${perPage}&sort=${sortOrder === 'asc' ? '' : '-'}${sortField}${query}`)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        setPreProjects(data.pre_projects || []);
        setMeta(data.meta || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, perPage, sortOrder, sortField, searchTerm]);
  
  useEffect(() => {
    fetchPreProjects();
  }, [fetchPreProjects]);
  
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
  
  const extractProposedSystem = (description) => {
    const regex = /النظام المقترح:\s*(.*)/s;
    const match = description.match(regex);
    return match ? match[1].trim() : '';
  };
  
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value) {
      if (!wasSearching) {
        setPreviousPage(page);
        setWasSearching(true);
      }
      setPage(1);
    } else {
      if (wasSearching) {
        setPage(previousPage);
        setWasSearching(false);
      }
    }
  };
  
  useEffect(() => {
    localStorage.setItem('preProjectsPage', page);
  }, [page]);
  
  const handleAddButtonClick = () => {
    console.log("Add button clicked");
    setShowAddForm(true);
  };
  
  const handleSortChange = (e) => {
    const [field, order] = e.target.value.split('|');
    setSortField(field);
    setSortOrder(order);
  };
  
  // Pagination functions
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
    const maxVisiblePages = window.innerWidth < 600 ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
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
      <h1>مشاريع المقدمة</h1>
  
      {/* Show add button for graduation_students, teachers, and admins */}
      {canAddPreProject && (
        <button onClick={handleAddButtonClick} className="add-project-btn">
          إضافة مقدمة مشروع
        </button>
      )}
  
      <div className="controls">
        <input
          type="text"
          placeholder="ابحث عن مشاريع المقدمة..."
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
          <p>جاري تحميل مشاريع المقدمة ...</p>
        </div>
      ) : (
        <>
                     <ul className="project-list">
  {preProjects.length > 0 ? (
    preProjects.map((project) => {
      const proposedSystem = extractProposedSystem(project.pre_project.description);
      return (
        <li key={project.pre_project.id} className="project-item">
          <Link to={`/PreProjects/${project.pre_project.id}`}>
            <h3 className="project-name">{project.pre_project.name}</h3>
            <p className="project-description">
              {proposedSystem ? proposedSystem : project.pre_project.description}
            </p>
          </Link>
        </li>
      );
    })
  ) : (
    <h1 className="no-projects">لا يوجد مشاريع مقدمة</h1>
  )}
</ul>
        </>
      )}
  
      <div className="pagination-container">
        <div className="pagination">
          {meta.current_page > 1 && (
            <button onClick={() => setPage(1)} className="pagination-btn">
              الأول
            </button>
          )}
          <button
            onClick={goToPreviousPage}
            disabled={meta.current_page === 1}
            className="pagination-btn"
          >
            <i className="fas fa-angle-right"></i>
          </button>
          {renderPageNumbers()}
          <button
            onClick={goToNextPage}
            disabled={meta.current_page === meta.last_page}
            className="pagination-btn"
          >
            <i className="fas fa-angle-left"></i>
          </button>
          {meta.current_page < meta.last_page && (
            <button onClick={() => setPage(meta.last_page)} className="pagination-btn">
              الأخير
            </button>
          )}
        </div>
        <div className="pagination-info">
          الصفحة {meta.current_page} من {meta.last_page}
        </div>
      </div>
  
      <div>
  {userAssociatedProjects.length > 0 && (
    <div className="user-associated-projects">
      <h2 className="section-title">المشاريع المرتبط بها</h2>
      <ul className="project-list">
        {preProjects.length > 0 ? (
          preProjects
            .filter((project) => 
              userAssociatedProjects.some((associatedProject) => 
                associatedProject.id === project.pre_project.id
              )
            )
            .map((project) => {
              const proposedSystem = extractProposedSystem(project.pre_project.description);
              return (
                <li key={project.pre_project.id} className="project-item">
                  <Link to={`/PreProjects/${project.pre_project.id}`}>
                    <h3 className="project-name">{project.pre_project.name}</h3>
                    <p className="project-description">
                      {proposedSystem ? proposedSystem : project.pre_project.description}
                    </p>
                  </Link>
                </li>
              );
            })
  ) : (
    <h1 className="no-projects">لا يوجد مشاريع مقدمة</h1>
  )}
</ul>
          </div>
        )}
      </div>
  
      {showAddForm && canAddPreProject && (
        <div className="overlay">
          <AddProjectForm closeForm={() => setShowAddForm(false)} refreshProjects={fetchPreProjects} />
        </div>
      )}
    </div>
  );
};
  
export default PreProjects;
