import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const AddPreProjectForm = ({ closeForm, refreshProjects }) => {
  const [formData, setFormData] = useState({
    name: "",
    introduction: "", // New field
    currentSystem: "", // New field
    proposedSystem: "", // New field
    students: [],
    advisors: [""],
    year: "",
    season: "",
    file: null,
    file_description: "",
    confirm: "" // New field to skip similarity check when set to "true"
  });

  const [userEmail, setUserEmail] = useState("");
  const [userRoles, setUserRoles] = useState([]); // New state for user roles
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];

  useEffect(() => {
    // Fetch user data on component mount
    fetch("http://localhost:8080/me", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch user data");
        return response.json();
      })
      .then((data) => {
        const email = data?.users?.email;
        const roles = data?.users?.roles; // Expecting roles as an array
        setUserRoles(roles || []);
        if (email) {
          setUserEmail(email);
          // Only auto-add as student if the user is NOT a teacher or admin.
          if (!(roles && (roles.includes("teacher") || roles.includes("admin")))) {
            setFormData((prevData) => {
              const updatedStudents = prevData.students.includes(email)
                ? prevData.students
                : [email];
              return {
                ...prevData,
                students: updatedStudents
              };
            });
          }
        }
      })
      .catch((error) => console.error("Error fetching user data:", error));

    // Fetch students
    fetch("http://localhost:8080/graduationstudents?role_ids=4", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch students");
        return response.json();
      })
      .then((data) => {
        setStudents(data.students);
      })
      .catch((error) => console.error("Error fetching students:", error));
  }, []);

  useEffect(() => {
    // Fetch teachers when component mounts
    fetch("http://localhost:8080/teachers", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch teachers");
        return response.json();
      })
      .then((data) => {
        setTeachers(data.teachers);
      })
      .catch((error) => console.error("Error fetching teachers:", error));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: null
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ];

    if (file && allowedTypes.includes(file.type)) {
      setFormData((prevData) => ({
        ...prevData,
        file: file
      }));
      setErrors((prevErrors) => ({
        ...prevErrors,
        file: null // Clear any previous file errors
      }));
    } else {
      setErrors((prevErrors) => ({
        ...prevErrors,
        file: "يرجى تحميل ملف بصيغة PDF أو DOCX أو PPTX فقط"
      }));
    }
  };

  const handleDynamicFieldChange = (field, index, value) => {
    setFormData((prevData) => {
      const currentField = prevData[field] || [];
      const updatedField = [...currentField];
      updatedField[index] = value;
      return { ...prevData, [field]: updatedField };
    });
  };

  const addDynamicField = (field) => {
    setFormData((prevData) => {
      const currentFields = prevData[field] || [];
      // Check if we've reached the maximum limit of 3
      if (currentFields.length >= 3) {
        return prevData; // Don't add more fields
      }
      return {
        ...prevData,
        [field]: [...currentFields, ""]
      };
    });
  };

  const removeDynamicField = (field, index) => {
    setFormData((prevData) => {
      const updatedField = [...prevData[field]];
      updatedField.splice(index, 1);
      return { ...prevData, [field]: updatedField };
    });
  };

  const validateForm = () => {
    let validationErrors = {};

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

    if (!formData.currentSystem) {
      validationErrors.currentSystem = "النظام الحالي مطلوب";
    } else if (formData.currentSystem.length < 20) {
      validationErrors.currentSystem = "يجب أن يكون النظام الحالي على الأقل 20 حرفاً";
    } else if (formData.currentSystem.length > 1000) {
      validationErrors.currentSystem = "لا يتجاوز النظام الحالي 1000 حرف";
    }

    if (!formData.proposedSystem) {
      validationErrors.proposedSystem = "النظام المقترح مطلوب";
    } else if (formData.proposedSystem.length < 20) {
      validationErrors.proposedSystem = "يجب أن يكون النظام المقترح على الأقل 20 حرفاً";
    } else if (formData.proposedSystem.length > 1000) {
      validationErrors.proposedSystem = "لا يتجاوز النظام المقترح 1000 حرف";
    }

    if (!formData.year || !years.includes(parseInt(formData.year))) {
      validationErrors.year = "السنة مطلوبة";
    }

    if (!formData.season) {
      validationErrors.season = "الموسم مطلوب";
    } else if (!["spring", "fall"].includes(formData.season)) {
      validationErrors.season = "يجب اختيار موسم ربيع أو خريف";
    }

 if (formData.students.length === 0) {
      validationErrors.students = "يجب إضافة طالب واحد على الأقل";
  }
    if (!formData.advisors.some((advisor) => advisor.trim() !== "")) {
      validationErrors.advisors = "يجب إضافة مشرف واحد على الأقل";
    }

    if (formData.file_description && formData.file_description.length > 1000) {
      validationErrors.file_description =
        "لا يمكن لوصف ملف المشروع أن يكون أكثر من 1000 حرف";
    }

    return validationErrors;
  };
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    const combinedDescription = `
      المقدمة:
      ${formData.introduction}
      
      النظام الحالي:
      ${formData.currentSystem}
      
      النظام المقترح:
      ${formData.proposedSystem}
    `;
  
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    const data = new FormData();
  
    Object.entries(formData).forEach(([key, value]) => {
      if (key === "file" && value) data.append(key, value);
      else if (Array.isArray(value)) data.append(key, value.join(","));
      else data.append(key, value);
    });
    data.append("description", combinedDescription);
  
    fetch("http://localhost:8080/preproject", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: data
    })
      .then(async (response) => {
        const errorData = await response.json();
        setIsSubmitting(false);
        if (!response.ok) {
          const backendErrors = {};
          if (errorData.error?.error === "Similar projects found" && errorData.error?.similar_projects) {
              backendErrors.general = "مشروعك يشبه مشاريع موجودة. يرجى تعديل مشروعك.";
              backendErrors.similarProjects = errorData.error.similar_projects; // Set similar projects

          } else {
              backendErrors.general = errorData.message || "حدث خطأ غير متوقع"; // Fallback message
          }
          setErrors(backendErrors); // Set the errors state
          return Promise.reject(errorData);
        }
        refreshProjects();
        closeForm();
      })
      .catch((error) => {
        console.error("Error submitting project:", error);
        setErrors((prevErrors) => ({
          ...prevErrors,
          general: error?.message || "حدث خطأ غير متوقع" // Ensure this is a string
        }));
        setIsSubmitting(false);
      });
  };
  // This function is called when an admin/teacher clicks the "Add Anyway" button.
  const handleAddAnyway = () => {
    setFormData((prev) => ({ ...prev, confirm: "true" })); // Set confirm to true
    handleSubmit(); // Call handleSubmit to submit the form
  };

  return (
    <div className="overlaying-content">
      <h2 className="headeraddform">إضافة مشروع جديد</h2>
      <form onSubmit={handleSubmit}>
        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}
        {/* Form Fields */}
        <div className="form-grid">
          {/* First Column */}
          <div className="form-column">
            <div className="form-group">
              <label>اسم المشروع</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? "error-input" : ""}
                disabled={isSubmitting}
              />
              {errors.name && (
                <div className="error-message">{errors.name}</div>
              )}
            </div>

            <div className="form-column">
              <div className="form-group">
                <label>المقدمة</label>
                <textarea
                  name="introduction"
                  value={formData.introduction}
                  onChange={handleChange}
                  className={errors.introduction ? "error-input" : ""}
                />
                {errors.introduction && (
                  <div className="error-message">{errors.introduction}</div>
                )}
              </div>
              <div className="form-group">
                <label>النظام الحالي</label>
                <textarea
                  name="currentSystem"
                  value={formData.currentSystem}
                  onChange={handleChange}
                  className={errors.currentSystem ? "error-input" : ""}
                />
                {errors.currentSystem && (
                  <div className="error-message">{errors.currentSystem}</div>
                )}
              </div>
              <div className="form-group">
                <label>النظام المقترح</label>
                <textarea
                  name="proposedSystem"
                  value={formData.proposedSystem}
                  onChange={handleChange}
                  className={errors.proposedSystem ? "error-input" : ""}
                />
                {errors.proposedSystem && (
                  <div className="error-message">{errors.proposedSystem}</div>
                )}
              </div>
            </div>
            <div className="form-group">
              <span>الطلاب</span>
              {formData.students.map((student, index) => (
                <div key={index} className="dynamic-field">
                  {student === userEmail ? (
                    <input type="text" value={student} disabled />
                  ) : (
                    <select
                      value={student}
                      onChange={(e) =>
                        handleDynamicFieldChange("students", index, e.target.value)
                      }
                      disabled={isSubmitting}
                    >
                      <option value="">اختر طالب</option>
                      {(students || [])
                        .filter(
                          (s) =>
                            s?.email === student ||
                            !(formData.students || []).includes(s?.email)
                        )
                        .map((s) => (
                          <option key={s?.id} value={s?.email}>
                            {s?.name || "غير معروف"}
                          </option>
                        ))}
                    </select>
                  )}
                  {student !== userEmail && (
                    <button
                      type="button"
                      onClick={() => removeDynamicField("students", index)}
                      disabled={isSubmitting}
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addDynamicField("students")}
                disabled={
                  isSubmitting ||
                  (formData.students || []).length >= 3 ||
                  (formData.students || []).filter((s) => s !== userEmail).length >=
                    2
                }
              >
                إضافة طالب
              </button>
            </div>
          </div>
          <div className="form-column">
            {(formData.advisors || []).map((advisor, index) => (
              <div key={index} className="dynamic-field">
                <select
                  value={advisor || ""}
                  onChange={(e) => {
                    const selectedEmail = e.target.value;
                    handleDynamicFieldChange("advisors", index, selectedEmail);
                  }}
                  className={errors[`advisor_${index}`] ? "error-input" : ""}
                  disabled={isSubmitting}
                >
                  <option value="">اختر مشرف</option>
                  {(teachers || [])
                    .filter(
                      (teacher) =>
                        teacher.email === advisor ||
                        !formData.advisors.includes(teacher.email)
                    )
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.email}>
                        {teacher.name}
                      </option>
                    ))}
                </select>
                {(formData.advisors || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDynamicField("advisors", index)}
                    disabled={isSubmitting}
                  >
                    حذف
                  </button>
                )}
                {errors[`advisor_${index}`] && (
                  <div className="error-message">
                    {errors[`advisor_${index}`]}
                  </div>
                )}
              </div>
            ))}
            {errors.advisors && (
              <div className="error-message">{errors.advisors}</div>
            )}
            <button
              type="button"
              onClick={() => addDynamicField("advisors")}
              disabled={
                isSubmitting ||
                !formData.advisors ||
                (formData.advisors?.length || 0) >= 3 ||
                (formData.advisors?.length || 0) >= (teachers?.length || 0)
              }
            >
              إضافة مشرف
            </button>

            <div className="form-row">
              <div className="form-group">
                <label>السنة</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className={errors.year ? "error-input" : ""}
                  disabled={isSubmitting}
                >
                  <option value="">اختر سنة</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {errors.year && (
                  <div className="error-message">{errors.year}</div>
                )}
              </div>

              <div className="form-group">
                <label>الفصل</label>
                <select
                  name="season"
                  value={formData.season}
                  onChange={handleChange}
                  className={errors.season ? "error-input" : ""}
                  disabled={isSubmitting}
                >
                  <option value="">اختر فصل</option>
                  <option value="fall">الخريف</option>
                  <option value="spring">الربيع</option>
                </select>
                {errors.season && (
                  <div className="error-message">{errors.season}</div>
                )}
              </div>
            </div>
            <div className="form-group">
              {formData.file && (
                <div className="form-group">
                  <span>وصف الملف</span>
                  <input
                    type="text"
                    name="file_description"
                    value={formData.file_description || ""}
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
                    {formData.file ? formData.file.name : "اختر ملف"}
                  </span>
                  <input type="file" name="file" onChange={handleFileChange} />
                </div>
                {errors.file && (
                  <div className="error-message">{errors.file}</div>
                )}
              </label>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "جاري الإضافة..." : "إضافة مشروع"}
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

        {/* If the backend returned a similarity error AND the user is admin/teacher,
            show an extra button to add the project anyway (which sends confirm = "true"). */}
      {errors.similarProjects && errors.similarProjects.length > 0 && (
      <div className="similar-projects-error">
        <div className="error-message">🚀 مشاريع مشابهة تم العثور عليها</div>
        <p className="error-description">
          ⚠️ يرجى تعديل مشروعك لأنه يشبه المشاريع التالية:
        </p>

        <div className="similar-projects-list">
          {errors.similarProjects.slice(0, 3).map((project, index) => {
            const isPreProject = project.source_table === "pre_project";
            return (
              <div key={project.project_id || index} className="similar-project-card">
                <div className="similar-project-content">
                  <h3 className="project-title">📂 {project.project_name}</h3>
                  <p className="project-description">{project.project_description}</p>
                  <p className="project-similarity">
                    نسبة التشابه: <span>{project.similarity_score}%</span>
                  </p>
                  <p className="project-type">
                    نوع المشروع:{" "}
                    <span>{isPreProject ? "مشروع أولي" : "مشروع نهائي"}</span>
                  </p>
                </div>
                <Link
                  to={isPreProject ? `/PreProjects/${project.project_id}` : `/projects/${project.project_id}`}
                  className="view-details-btn"
                >
                  عرض التفاصيل 🚀
                </Link>
              </div>
            );
          })}
        </div>

        {(userRoles.includes("admin") || userRoles.includes("teacher")) && (
          <button
            type="button"
            onClick={handleAddAnyway}
            disabled={isSubmitting}
            className="confirm-add-btn"
          >
            إضافة المشروع على أي حال ✅
          </button>
        )}
      </div>
)}

      </form>
    </div>
  );
};

export default AddPreProjectForm;
