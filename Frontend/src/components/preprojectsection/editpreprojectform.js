import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
const splitDescription = (description) => {
  const sections = {
    introduction: '',
    currentSystem: '',
    proposedSystem: ''
  };

  // Log if description is undefined
  if (!description) {
    console.warn("Description is undefined or null. Returning default sections.");
    return sections; // Return default sections if description is not provided
  }

  // Use regex to match the sections
  const regex = /المقدمة:\s*(.*?)\s*النظام الحالي:\s*(.*?)\s*النظام المقترح:\s*(.*)/s;
  const match = description.match(regex);

  if (match) {
    sections.introduction = match[1].trim();
    sections.currentSystem = match[2].trim();
    sections.proposedSystem = match[3].trim();
  }

  return sections;
};
const EditPreProjectForm = ({ project, closeForm, onUpdate }) => {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getProjectDetail = (key, defaultValue = '') => {
    if (project?.pre_project?.pre_project?.[key] !== undefined) {
      return project.pre_project.pre_project[key];
    }
    if (project?.pre_project?.[key] !== undefined) {
      return project.pre_project[key];
    }
    if (project?.[key] !== undefined) {
      return project[key];
    }
    return defaultValue;
  };
  const description = getProjectDetail('description', 'المقدمة:\n\nالنظام الحالي:\n\nالنظام المقترح:\n');
  console.log("Description:", description); // Log the description to check its value
  const parseAdvisors = (advisors) => {
    if (!advisors) return [];
    const advisorList = project.pre_project ? project.pre_project.advisors : advisors;
    if (Array.isArray(advisorList)) {
      return advisorList.map(advisor => advisor.advisor_email || advisor.email || '');
    }
    return [];
  };

 const parseStudents = (students) => {
    if (!students) return [];
    const studentList = project.pre_project ? project.pre_project.students : students;
    const projectOwnerId = getProjectDetail('project_owner');

    if (Array.isArray(studentList)) {
      return studentList.map(student => ({
        email: student.student_email || student.email || '',
        isProjectOwner: student.student_id === projectOwnerId || student.id === projectOwnerId
      }));
    }
    return [];
  };

  const parseDiscutants = (discussants) => {
    if (!discussants) return [];
    const discutantList = project.pre_project ? project.pre_project.discussants : discussants;
    if (Array.isArray(discutantList)) {
      return discutantList.map(discutant => discutant.discussant_email || '');
    }
    return [];
  };
  const { introduction, currentSystem, proposedSystem } = splitDescription(getProjectDetail('description'));

  const [formData, setFormData] = useState({
    name: getProjectDetail('name'),
    introduction, // Use the extracted introduction
    currentSystem, // Use the extracted current system
    proposedSystem, // Use the extracted proposed system
    students: parseStudents(project.students),
    advisors: parseAdvisors(project.advisors),
    discutants: parseDiscutants(project.discussants || []),
    year: getProjectDetail('year'),
    season: getProjectDetail('season'),
    file: null,
    file_name: getProjectDetail('file') ? getProjectDetail('file').split('/').pop() : '',
    file_description: getProjectDetail('file_description', ''),
    degree: getProjectDetail('degree', '')
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      setIsAdmin(decodedToken.user_role.includes('admin'));
    }
  }, []);

  useEffect(() => {
    fetch("http://localhost:8080/graduationstudents?role_ids=4", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch students");
        return response.json();
      })
      .then((data) => setStudents(data.students))
      .catch((error) => console.error("Error fetching students:", error));
  }, []);

  useEffect(() => {
    fetch("http://localhost:8080/teachers", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch teachers");
        return response.json();
      })
      .then((data) => setTeachers(data.teachers))
      .catch((error) => console.error("Error fetching teachers:", error));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
    setErrors(prevErrors => ({
      ...prevErrors,
      [name]: null,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
  
    if (file && allowedTypes.includes(file.type)) {
      setFormData(prevData => ({
        ...prevData,
        file: file,
      }));
      setErrors(prevErrors => ({
        ...prevErrors,
        file: null, // Clear any previous file errors
      }));
    } else {
      setErrors(prevErrors => ({
        ...prevErrors,
        file: 'يرجى تحميل ملف بصيغة PDF أو DOCX أو PPTX فقط', // Error message in Arabic
      }));
    }
  };

  const handleDynamicFieldChange = (field, index, value) => {
    if (field === 'advisors') {
      // Check if advisor is already a discussant
      if (formData.discutants.includes(value)) {
        setErrors(prev => ({
          ...prev,
          advisors: 'لا يمكن إضافة مناقش كمشرف'
        }));
        return;
      }

      // Check for duplicate advisors
      const updatedAdvisors = [...formData.advisors];
      if (updatedAdvisors.includes(value) && updatedAdvisors.indexOf(value) !== index) {
        setErrors(prev => ({
          ...prev,
          advisors: 'هذا المشرف مضاف بالفعل'
        }));
        return;
      }
    }

    if (field === 'discutants') {
      // Check if discussant is already an advisor
      if (formData.advisors.includes(value)) {
        setErrors(prev => ({
          ...prev,
          discutants: 'لا يمكن إضافة مشرف كمناقش'
        }));
        return;
      }

      // Check for duplicate discussants
      const updatedDiscutants = [...formData.discutants];
      if (updatedDiscutants.includes(value) && updatedDiscutants.indexOf(value) !== index) {
        setErrors(prev => ({
          ...prev,
          discutants: 'هذا المناقش مضاف بالفعل'
        }));
        return;
      }
    }

    if (field === 'students') {
      // Check for duplicate students
      const studentEmails = formData.students.map(s => s.email);
      if (studentEmails.includes(value.email) && studentEmails.indexOf(value.email) !== index) {
        setErrors(prev => ({
          ...prev,
          students: 'هذا الطالب مضاف بالفعل'
        }));
        return;
      }
    }

    setFormData(prevData => {
      const updatedField = [...prevData[field]];
      updatedField[index] = value;
      return { ...prevData, [field]: updatedField };
    });
  };


  const addDynamicField = (field) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: [...prevData[field], ""],
    }));
  };

  const removeDynamicField = (field, index) => {
    if (field === 'students') {
      const studentToRemove = formData.students[index];
      if (studentToRemove.isProjectOwner) return;
    }

    setFormData(prevData => {
      const updatedField = [...prevData[field]];
      updatedField.splice(index, 1);
      return { ...prevData, [field]: updatedField };
    });
  };

  const renderDiscutantsField = () => {
    if (!isAdmin) return null;
    return (
      <div className={`form-group ${errors.discutants ? "error-label" : ""}`}>
        <span>المناقشون</span>
        {formData.discutants.map((discutant, index) => (
          <div key={index} className="dynamic-field">
            <select
              value={discutant}
              onChange={(e) => handleDynamicFieldChange("discutants", index, e.target.value)}
              className={errors.discutants ? "error-input" : ""}
              disabled={isSubmitting}
            >
              <option value="">اختر مناقش</option>
              {teachers
  .filter(teacher => 
    teacher.email === discutant || 
    (!formData.discutants.includes(teacher.email) && 
     !formData.advisors.includes(teacher.email))
  )
  .map((teacher) => (
    <option key={teacher.id} value={teacher.email}>
      {teacher.name}
    </option>
  ))}
            </select>
            <button
              type="button"
              onClick={() => removeDynamicField("discutants", index)}
              disabled={isSubmitting}
            >
              حذف
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addDynamicField("discutants")}
          disabled={isSubmitting}
        >
          إضافة مناقش
        </button>
        {errors.discutants && <div className="error-message">{errors.discutants}</div>}
      </div>
    );
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

  
    let validationErrors = {};
  
    // Name validation
    if (!formData.name) {
      validationErrors.name = "اسم المشروع مطلوب";
    } else if (formData.name.length < 3) {
      validationErrors.name = "يجب أن يكون اسم المشروع على الأقل 3 أحرف";
    } else if (formData.name.length > 150) {
      validationErrors.name = "يجب أن يكون اسم المشروع أقل من 150 حرف";
    }
  
  
    if (!formData.introduction) {
      validationErrors.introduction = "المقدمة مطلوبة";
    } else if (formData.introduction.length < 20) {
      validationErrors.introduction = "يجب أن تكون المقدمة على الأقل 20 حرفاً";
    } else if (formData.introduction.length > 1000) {
      validationErrors.introduction = "لا تتجاوز المقدمة 1000 حرف";
    }

    // Validate currentSystem
    if (!formData.currentSystem) {
      validationErrors.currentSystem = "النظام الحالي مطلوب";
    } else if (formData.currentSystem.length < 20) {
      validationErrors.currentSystem = "يجب أن يكون النظام الحالي على الأقل 20 حرفاً";
    } else if (formData.currentSystem.length > 1000) {
      validationErrors.currentSystem = "لا يتجاوز النظام الحالي 1000 حرف";
    }

    // Validate proposedSystem
    if (!formData.proposedSystem) {
      validationErrors.proposedSystem = "النظام المقترح مطلوب";
    } else if (formData.proposedSystem.length < 20) {
      validationErrors.proposedSystem = "يجب أن يكون النظام المقترح على الأقل 20 حرفاً";
    } else if (formData.proposedSystem.length > 1000) {
      validationErrors.proposedSystem = "لا يتجاوز النظام المقترح 1000 حرف";
    }

    // Introduction validation
    if (!formData.introduction) {
      validationErrors.introduction = "المقدمة مطلوبة";
    }
  
    // Current System validation
    if (!formData.currentSystem) {
      validationErrors.currentSystem = "النظام الحالي مطلوب";
    }
  
    // Proposed System validation
    if (!formData.proposedSystem) {
      validationErrors.proposedSystem = "النظام المقترح مطلوب";
    }
  
    const currentYear = new Date().getFullYear();
    if (!formData.year || formData.year < currentYear || formData.year > currentYear + 1) {
      validationErrors.year = `يجب أن تكون السنة إما ${currentYear} أو ${currentYear + 1}`;
    }
  
    if (!formData.year) {
      validationErrors.year = "السنة مطلوبة";
    }
  
    // Season validation
    if (!formData.season) {
      validationErrors.season = "الموسم مطلوب";
    }
    if (formData.students.length === 0) {
      validationErrors.students = "يجب إضافة طالب واحد على الأقل";
    }
    if (!formData.advisors.some(advisor => advisor.trim() !== "")) {
      validationErrors.advisors = "يجب إضافة مشرف واحد على الأقل";
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    const combinedDescription = `
    المقدمة:
    ${formData.introduction}
    
    النظام الحالي:
    ${formData.currentSystem}
    
    النظام المقترح:
    ${formData.proposedSystem}
  `;

  const data = new FormData();
  data.append("name", formData.name);
  data.append("description", combinedDescription); // Add the combined description
  data.append("year", formData.year);
  data.append("season", formData.season);
  data.append("students", formData.students.map(s => s.email).join(","));
  data.append("advisors", formData.advisors.join(","));

  if (isAdmin) {
    data.append("discutants", formData.discutants.join(","));
    data.append("degree", formData.degree);
  }

  if (formData.file) {
    data.append("file", formData.file);
  } else {
    data.append("keep_existing_file", "true");
  }

  if (formData.file_description) {
    data.append("file_description", formData.file_description);
  }
    fetch(`http://localhost:8080/preproject/${project?.id}`, {
  method: "PUT",
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: data
})
.then(async (response) => {
  const errorData = await response.json();
  setIsSubmitting(false);

  if (!response.ok) {
    handleBackendErrors(errorData);
    return Promise.reject(errorData);
  }

  return errorData;
})
.then((updatedProject) => {
  onUpdate(updatedProject.pre_project);
  closeForm();
})
.catch((error) => {
  console.error("Error updating project:", error);
  setIsSubmitting(false);
});
  };
  

  // Function to handle backend errors
  const handleBackendErrors = (errorData) => {
    const backendErrors = {};
    const errorObj = errorData.error;
if (errorObj=== "You already have an existing pre-project"){
 
    backendErrors.general = "لديك مشروع أولي موجود بالفعل.";
}else if (errorObj) {
      switch (errorObj.error) { // استخدام errorObj.error بدلاً من errorData.error
      
        case "Similar projects found":
          backendErrors.general = "مشروعك يشبه مشاريع موجودة بالفعل. يرجى تعديل مشروعك.";
          backendErrors.similarProjects = errorObj.similar_projects || []; // استخدام errorObj هنا
          break;
        default:
          backendErrors.general = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
      }
    } else {
      backendErrors.general = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
    }
    setErrors(backendErrors);

  };
  const hasAcceptedAdvisor = getProjectDetail('accepted_advisor') !== null && 
                            getProjectDetail('accepted_advisor') !== '';

  const renderStudentsField = () => {
    return (
      <div className={`form-group ${errors.students ? "error-label" : ""}`}>
        <span>الطلاب</span>
        {formData.students.map((student, index) => (
          <div key={index} className="dynamic-field">
            {student.isProjectOwner ? (
              <input
                type="text"
                value={student.email}
                disabled
              />
            ) : (
              <select
                value={student.email}
                onChange={(e) => handleDynamicFieldChange("students", index, {
                  ...student,
                  email: e.target.value
                })}
                className={errors.students ? "error-input" : ""}
                disabled={isSubmitting}
              >
                <option value="">اختر طالب</option>
                {students
                  .filter(s => 
                    s?.email === student.email ||
                    !formData.students.some(fs => fs.email === s?.email)
                  )
                  .map((s) => (
                    <option key={s?.id} value={s?.email}>
                      {s?.name || 'غير معروف'}
                    </option>
                  ))}
              </select>
            )}
            {!student.isProjectOwner && (
              <button
                type="button"
                onClick={() => removeDynamicField("students", index)}
                disabled={isSubmitting}
              >
                حذف
              </button>
            )}
            {student.isProjectOwner && (
              <span className="project-owner-label">(مالك المشروع)</span>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addDynamicField("students")}
          disabled={isSubmitting || formData.students.length >= 3}
        >
          إضافة طالب
        </button>
        {errors.students && <div className="error-message">{errors.students}</div>}
      </div>
    );
  };
  return (
    <div className="overlaying-content">
      <h2>تعديل المشروع</h2>
      <form onSubmit={handleSubmit}>
        {errors.general && <div className="error-message">{errors.general}</div>}
  
        <div className="form-grid">
          <div className="form-column">
            {(!hasAcceptedAdvisor || isAdmin) && ( // Show if project is not accepted by advisor or if user is admin
              <>
                <div className={`form-group ${errors.name ? "error-label" : ""}`}>
                  <span>اسم المشروع</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={errors.name ? "error-input" : ""}
                    disabled={isSubmitting } 
                  />
                  {errors.name && <div className="error-message">{errors.name}</div>}
                </div>
  
                <div className={`form-group ${errors.introduction ? "error-label" : ""}`}>
            <span>المقدمة</span>
            <textarea
              name="introduction"
              value={formData.introduction}
              onChange={handleChange}
              className={errors.introduction ? "error-input" : ""}
              disabled={isSubmitting}
            />
            {errors.introduction && <div className="error-message">{errors.introduction}</div>}
          </div>

          <div className={`form-group ${errors.currentSystem ? "error-label" : ""}`}>
            <span>النظام الحالي</span>
            <textarea
              name="currentSystem"
              value={formData.currentSystem}
              onChange={handleChange} className={errors.currentSystem ? "error-input" : ""}
              disabled={isSubmitting}
            />
            {errors.currentSystem && <div className="error-message">{errors.currentSystem}</div>}
          </div>

          <div className={`form-group ${errors.proposedSystem ? "error-label" : ""}`}>
            <span>النظام المقترح</span>
            <textarea
              name="proposedSystem"
              value={formData.proposedSystem}
              onChange={handleChange}
              className={errors.proposedSystem ? "error-input" : ""}
              disabled={isSubmitting}
            />
            {errors.proposedSystem && <div className="error-message">{errors.proposedSystem}</div>}

</div>
                {renderStudentsField()} {/* Render student-related field here */}
              </>
            )}
          </div>
  
          <div className="form-column">
            {(!hasAcceptedAdvisor || (isAdmin && !hasAcceptedAdvisor)) && ( // Same condition for showing advisor-related fields
              <>
                <div className={`form-group ${errors.advisors ? "error-label" : ""}`}>
                  <span>المشرفون</span>
                  {formData.advisors.map((advisor, index) => (
                    <div key={index} className="dynamic-field">
                      <select
                        value={advisor}
                        onChange={(e) => handleDynamicFieldChange("advisors", index, e.target.value)}
                        className={errors.advisors ? "error-input" : ""}
                        disabled={isSubmitting } // disable if advisor has accepted
                      >
                        <option value="">اختر مشرف</option>
                        {teachers
                          .filter(teacher => 
                            teacher.email === advisor || 
                            !formData.advisors.includes(teacher.email)
                          )
                          .map((teacher) => (
                            <option key={teacher.id} value={teacher.email}>
                              {teacher.name}
                            </option>
                          ))}
                      </select>
                      {formData.advisors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDynamicField("advisors", index)}
                          disabled={isSubmitting} // disable if advisor has accepted
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addDynamicField("advisors")}
                    disabled={isSubmitting  || formData.advisors.length >= 3} // limit advisors to 3
                  >
                    إضافة مشرف
                  </button>
                  {errors.advisors && <div className="error-message">{errors.advisors}</div>}
                </div>
           </>

           )}
  
                {renderDiscutantsField()}
  {!hasAcceptedAdvisor&&(
                <div className="form-row">
                  <div className={`form-group ${errors.year ? "error-label" : ""}`}>
                    <span>السنة</span>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      className={errors.year ? "error-input" : ""}
                      disabled={isSubmitting} // disable if advisor has accepted
                    >
                      <option value="">اختر سنة</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    {errors.year && <div className="error-message">{errors.year}</div>}
                  </div>
  
                  <div className={`form-group ${errors.season ? "error-label" : ""}`}>
                    <span>الفصل</span>
                    <select
                      name="season"
                      value={formData.season}
                      onChange={handleChange}
                      className={errors.season ? "error-input" : ""}
                      disabled={isSubmitting } // disable if advisor has accepted
                    >
                      <option value="">اختر فصل</option>
                      <option value="spring">ربيع</option>
                      <option value="fall">خريف</option>
                    </select>
                    {errors.season && <div className="error-message">{errors.season}</div>}
                  </div>
                </div>
  )}
  <div className="form-group">
  {(formData.file || getProjectDetail('file')) && (
    <div className="form-group">
      <span>وصف الملف</span>
      <input
        type="text"
        name="file_description"
        value={formData.file_description}
        onChange={handleChange}
        placeholder="أدخل وصفًا للملف"
        disabled={isSubmitting}
      />
    </div>
  )}
  <label>
    ملف (اختياري)
    <div className="file-upload">
      <span>
        {formData.file 
          ? formData.file.name 
          : formData.file_name 
          ? formData.file_name 
          : "اختر ملف"}
      </span>
      <input 
        type="file" 
        name="file" 
        onChange={handleFileChange} 
      />
    </div>
    {errors.file && <div className="error-message">{errors.file}</div>} {/* Display error message */}
  </label>
</div>
          </div>
        </div>
  
        <div className="form-actions">
          <button type="submit" disabled={isSubmitting} >
            {isSubmitting ? "جاري التعديل..." : "إرسال التعديل"}
          </button>
          <button 
            type="button" 
            onClick={closeForm} 
            disabled={isSubmitting} 
            className="cancel-button"
          >
            إلغاء
          </button>
        </div>
        {errors.general && (
  <div className="error-message">
    {errors.general}
  </div>
)}
{errors.similarProjects && errors.similarProjects.length > 0 && (
  <div className="similar-projects-error">
    <div className="error-message">
      مشاريع مشابهة تم العثور عليها
    </div>
    <p style={{
      color: '#856404',
      marginBottom: '10px'
    }}>
      يرجى تعديل مشروعك لأنه يشبه المشاريع التالية:
    </p>
    <div className="similar-projects-list">
      {errors.similarProjects.map((project, index) => (
        <div key={project.project_id || index} className="similar-project-item">
          <div style={{flex: 1}}>
            <div className="similar-project-item-title">
              {project.project_name}
            </div>
            <p className="similar-project-item-description">
              {project.project_description}
            </p>
            <div className="similar-project-item-similarity">
              نسبة التشابه: {project.similarity_score}%
            </div>
            <div className="similar-project-item-type">
              نوع المشروع: {project.source_table === 'pre_project' ? "مشروع أولي" : "مشروع نهائي"}
            </div>
          </div>
          <Link 
            to={project.source_table === 'pre_project' 
              ? `/PreProjects/${project.project_id}` 
              : `/projects/${project.project_id}`
            } 
            className="link-button"
          >
            عرض التفاصيل
          </Link>
        </div>
      ))}
    </div>
  </div>
)}
      </form>
    </div>
  );
  
}  
export default EditPreProjectForm;