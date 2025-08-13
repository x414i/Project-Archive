import React from 'react';

const TeacherSelectionFields = ({
  formData,
  errors,
  isSubmitting,
  teachers,
  handleDynamicFieldChange,
  addDynamicField,
  removeDynamicField
}) => {
  return (
    <>
      {/* Advisors */}
      <div className={`form-group ${errors.advisors ? "error-label" : ""}`}>
        <span>المشرفون</span>
        {formData.advisors.map((advisor, index) => (
          <div key={index} className="dynamic-field">
            <select
              value={advisor || ""}
              onChange={(e) => handleDynamicFieldChange("advisors", index, e.target.value)}
              className={errors.advisors ? "error-input" : ""}
              disabled={isSubmitting}
            >
              <option value="">اختر مشرف</option>
              {(teachers || []).filter(teacher => 
                teacher.email === advisor || 
                (!formData.advisors.some(selectedAdvisor => 
                  selectedAdvisor === teacher.email) && 
                !formData.discutants.some(selectedDiscutant => 
                  selectedDiscutant === teacher.email)) // Exclude discutants from the advisors
              ).map((teacher) => (
                <option key={teacher.id} value={teacher.email}>
                  {teacher.name}
                </option>
              ))}
            </select>
            {formData.advisors.length > 1 && (
              <button
                type="button"
                onClick={() => removeDynamicField("advisors", index)}
                disabled={isSubmitting}
              >
                حذف
              </button>
            )}
          </div>
        ))}
        <button 
          type="button" 
          onClick={() => addDynamicField("advisors")} 
          disabled={isSubmitting || formData.advisors.length >= 3}
        >
          إضافة مشرف
        </button>
        {errors.advisors && <div className="error-message">{errors.advisors}</div>}
      </div>

      {/* Discutants */}
      <div className={`form-group ${errors.discutants ? "error-label" : ""}`}>
        <span>المناقشون</span>
        {formData.discutants.map((discutant, index) => (
          <div key={index} className="dynamic-field">
            <select
              value={discutant || ""}
              onChange={(e) => handleDynamicFieldChange("discutants", index, e.target.value)}
              className={errors.discutants ? "error-input" : ""}
              disabled={isSubmitting}
            >
              <option value="">اختر مناقش</option>
              {(teachers || []).filter(teacher => 
                teacher.email === discutant || 
                (!formData.discutants.some(selectedDiscutant => 
                  selectedDiscutant === teacher.email) && 
                !formData.advisors.some(selectedAdvisor => 
                  selectedAdvisor === teacher.email)) // Exclude advisors from the discussants
              ).map((teacher) => (
                <option key={teacher.id} value={teacher.email}>
                  {teacher.name}
                </option>
              ))}
            </select>
            {formData.discutants.length > 1 && (
              <button
                type="button"
                onClick={() => removeDynamicField("discutants", index)}
                disabled={isSubmitting}
              >
                حذف
              </button>
            )}
          </div>
        ))}
        <button 
          type="button" 
          onClick={() => addDynamicField("discutants")} 
          disabled={isSubmitting || formData.discutants.length >= 3}
        >
          إضافة مناقش
        </button>
        {errors.discutants && <div className="error-message">{errors.discutants}</div>}
      </div>
    </>
  );
};

export default TeacherSelectionFields;