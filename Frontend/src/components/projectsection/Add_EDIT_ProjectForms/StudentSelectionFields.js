import React from 'react';
const StudentSelectionFields = ({
  formData,
  errors,
  isSubmitting,
  students,
  handleDynamicFieldChange,
  addDynamicField,
  removeDynamicField
}) => {
  return (
    <div className={`form-group ${errors.students ? "error-label" : ""}`}>
      <span>الطلاب</span>
      {formData.students.map((student, index) => (
        <div key={index} className="dynamic-field">
          <select
            value={student || ""}
            onChange={(e) => handleDynamicFieldChange("students", index, e.target.value)}
            className={errors.students ? "error-input" : ""}
            disabled={isSubmitting}
          >
            <option value="">اختر طالب</option>
            {(students || []).filter(s => 
              s.email === student || 
              !formData.students.some(selectedStudent => 
                selectedStudent === s.email
              )
            ).map((s) => (
              <option key={s.id} value={s.email}>
                {s.name}
              </option>
            ))}
          </select>
          {formData.students.length > 1 && (
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
        disabled={isSubmitting || formData.students.length >= 3}
      >
        إضافة طالب
      </button>
      {errors.students && <div className="error-message">{errors.students}</div>}
    </div>
  );
};
export default StudentSelectionFields;